import randomString from 'randomstring';

import adminModel from '../../models/users/admin_model.mjs';
import teacherModel from '../../models/users/teacher_model.mjs';
import { handleServerError } from '../../utils/handle/handle_server.mjs';
import * as userUtils from '../../utils/user/user_utils.mjs';
import { getDateAndTime } from '../../utils/date/date_utils.mjs';
import { exportAdmins } from '../../utils/files/export_admins.mjs';

// controlador para registrar un nuevo administrador en el sistema
export const createAdminAccount = async(req, res) => {
    try{
        const body = req.body;
        const { fecha, hora } = await getDateAndTime();
        const existingAdmin = await adminModel.findOne({correo : body.correo});
        const existingTeacher = await teacherModel.findOne({correo : body.correo});

        //verificar si el correo pertenece a otro administrador
        if(existingAdmin){
            return res.status(400).json({
                success : false,
                message : 'Este correo ya pertenece a una cuenta registrada'
            });
        }
        //Verificar si el correo pertenece a un docente
        else if(existingTeacher){
            return res.status(400).json({
                success : false,
                message : 'El correo esta asociado a una cuenta de docente, los correos para administradores deben ser los de coordinacion. Ej: sistemas@dominio, gestion@dominio'
            });
        }

        //Si no hay ningun problema, guardar la informacion del usuario
        const admin = new adminModel({
            nombre : body.nombre,
            correo : body.correo,
            cuenta : 'Administrador',
            carrera : body.carrera,
            fechaRegistro : fecha,
            horaRegistro : hora,
            password : body.password,
            sesion : {
                ultimaSesion : '',
                codigoAcceso : '',
                validezCodigoAcceso : false,
            }
        });

        // Guardar en mongodb
        await admin.save(); 

        // respuesta donde se confirma que el usuario se ha registrado
        return res.status(200).json({
            success : true,
            message : 'Administrador registrado',
        });
    }catch(error){
        // manejar los errores
        handleServerError(res, error);
    }
}

// Controlador para obtener la informacion de todos los administradores del sistema
export const listAllAdmins  = async(req, res) => {
    try{
        // Informacion para el paginado
        const { search = '', page = 1, pageSize = 10 } = req.query;

        // Crear filtro para búsqueda por nombre o correo
        const searchRegex = new RegExp(search, 'i');
        const filter = { 
            $or: [
                { nombre : searchRegex }, 
                { correo : searchRegex }
            ] 
        };

        // Consulta paginada con filtro
        const admins = await adminModel
            .find(filter)
            .select('-password')
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        // conteo total de coincidencias 
        const total = await adminModel.countDocuments(filter);

        // verificar que exista un resultaado minimo
        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron administradores con ese criterio de búsqueda',
            });
        }

        // Enviar la información correspondiente
        return res.status(200).json({
            success: true,
            admins,
            currentPage: page,
            pageSize: pageSize,
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
        });
    }catch(error){
        handleServerError(res, error);
    }
}

// Exportar todos los administradores del sistema
export const exportAdminsPDF = async(req, res) => {
    try{
        // Buscar todos los administradores
        const admins = await adminModel.find().select('-password');
        
        // Crear el pdf mediante la funcion exportAdmins()
        const buffer = await exportAdmins(admins);
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="administradores.pdf"',
            'Content-Length': buffer.length
        });
        res.end(buffer); 

    }catch(error){
        handleServerError(res, error);
    }
}

export const deleteAdmin = async(req, res) => {
    try{
        const id = req.params.id;
        const user = await userUtils.getUserById(id);
        if(!user){
            return res.status(404).json({
                success : false,
                message : 'Usuario no eliminado, debido a que no existe'
            });
        }
        await adminModel.findByIdAndDelete(user.id);
        return res.status(200).json({
            success : true,
            message : 'Administrador eliminado'
        });
    }catch(error){
        handleServerError(res, error);
    }
}