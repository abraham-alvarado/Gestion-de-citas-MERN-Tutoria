const mongoose = require("mongoose");
const doctorScheme = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    nombre: {
      type: String,
      required: true,
    },
    apellido: {
      type: String,
      required: true,
    },
    correo: {
      type: String,
      required: true,
    },
    telefono: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      required: true,
    },
    direccion: {
      type: String,
      required: true,
    },
    especialidad: {
      type: String,
      required: true,
    },
    experiencia: {
      type: String,
      required: true,
    },
    costo: {
      type: Number,
      required: true,
    },
    horario: {
      type: Array,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const doctorModel = mongoose.model("doctors", doctorScheme);
module.exports = doctorModel;
