const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware");
const Appointment = require("../models/appointmentModel");
const moment = require("moment");

router.post("/register", async (req, res) => {
  try {
    const userExists = await User.findOne({ correo: req.body.correo });
    if (userExists) {
      return res
        .status(400)
        .send({ message: "El usuario ya existe", success: false });
    }
    const contrasena = req.body.contrasena;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);
    req.body.contrasena = hashedPassword;
    const newuser = new User(req.body);
    await newuser.save();
    res
      .status(200)
      .send({ message: "El usuario fue creado exitosamente", success: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Ocurrio un error, intentalo de nuevo",
      success: false,
      error,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ correo: req.body.correo });
    if (!user) {
      return res
        .status(200)
        .send({ message: "El usuario no existe", success: false });
    }
    const isMatch = await bcrypt.compare(req.body.contrasena, user.contrasena);
    if (!isMatch) {
      return res
        .status(200)
        .send({ message: "Contraseña incorrecta", success: false });
    } else {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      res
        .status(200)
        .send({ message: "Bienvenido", success: true, data: token });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Ocurrio un error, intentalo de nuevo",
      success: false,
      error,
    });
  }
});

router.post("/get-user-info-by-id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.contrasena = undefined;
    if (!user) {
      return res
        .status(200)
        .send({ message: "El usuario no existe", success: false });
    } else {
      res.status(200).send({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Ocurrio un error, intentalo de nuevo",
      success: false,
      error,
    });
  }
});

router.post("/apply-doctor-account", authMiddleware, async (req, res) => {
  try {
    const newdoctor = new Doctor({ ...req.body, status: "pending" });
    await newdoctor.save();
    const adminUser = await User.findOne({ isAdmin: true });

    const unseenNotifications = adminUser.unseenNotifications;
    unseenNotifications.push({
      type: "new-doctor-request",
      message: `${newdoctor.nombre} ${newdoctor.apellido} ha solicitado una cuenta de doctor`,
      data: {
        doctorId: newdoctor._id,
        name: newdoctor.nombre + " " + newdoctor.apellido,
      },
      onClickPath: "/admin/doctorslist",
    });
    await User.findByIdAndUpdate(adminUser._id, { unseenNotifications });
    res.status(200).send({
      success: true,
      message:
        "Tu solicitud ha sido enviada, espera a que un administrador la apruebe",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Ocurrio un error en tu solicitud, intentalo de nuevo",
      success: false,
      error,
    });
  }
});

router.post(
  "/mark-all-notifications-as-seen",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.body.userId });
      const unseenNotifications = user.unseenNotifications;
      const seenNotifications = user.seenNotifications;
      seenNotifications.push(...unseenNotifications);
      user.unseenNotifications = [];
      user.seenNotifications = seenNotifications;
      const updatedUser = await user.save();
      updatedUser.contrasena = undefined;
      res.status(200).send({
        success: true,
        message: "Todas las notificaciones han sido marcadas como vistas",
        data: updatedUser,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ocurrio un error en tu solicitud, intentalo de nuevo",
        success: false,
        error,
      });
    }
  }
);

router.post("/delete-all-notifications", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.seenNotifications = [];
    user.unseenNotifications = [];
    updatedUser = await user.save();

    updatedUser.contrasena = undefined;
    res.status(200).send({
      success: true,
      message: "Todas las notificaciones han eliminadas",
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Ocurrio un error en tu solicitud, intentalo de nuevo",
      success: false,
      error,
    });
  }
});

router.get("/get-all-approved-doctors", authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: "approved" });
    res.status(200).send({
      message: "Doctors fetched successfully",
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error applying doctor account",
      success: false,
      error,
    });
  }
});

router.post("/book-appointment", authMiddleware, async (req, res) => {
  try {
    req.body.status = "pending";
    req.body.date = moment(req.body.date, "DD-MM-YYYY").toISOString();
    req.body.time = moment(req.body.time, "HH:mm").toISOString();
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    const user = await User.findOne({ _id: req.body.doctorInfo.userId });
    user.unseenNotifications.push({
      type: "new-appointment-request",
      message: `Tienes una nueva cita con ${req.body.userInfo.nombre}`,
      onclickPath: "/doctor/appointments",
    });
    await user.save();
    res.status(200).send({
      message: "Cita agendada exitosamente",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Ocurrió un error al agendar la cita",
      success: false,
      error,
    });
  }
});

router.post("/check-booking-avilability", authMiddleware, async (req, res) => {
  try {
    const date = moment(req.body.date, "DD-MM-YYYY").toISOString();
    const fromTime = moment(req.body.time, "HH:mm")
      .subtract(1, "hours")
      .toISOString();
    const toTime = moment(req.body.time, "HH:mm").add(1, "hours").toISOString();
    const doctorId = req.body.doctorId;
    const appointments = await Appointment.find({
      doctorId,
      date,
      time: { $gte: fromTime, $lte: toTime },
    });
    if (appointments.length > 0) {
      return res.status(200).send({
        message: "No hay citas disponibles",
        success: false,
      });
    } else {
      return res.status(200).send({
        message: "Hay citas disponibles",
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error agendando cita",
      success: false,
      error,
    });
  }
});

router.get("/get-appointments-by-user-id", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.body.userId });
    res.status(200).send({
      message: "Se han obtenido las citas exitosamente",
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error obteniendo citas",
      success: false,
      error,
    });
  }
});

module.exports = router;
