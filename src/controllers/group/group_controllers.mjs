import { handleServerError } from '../../utils/handle/handle_server.mjs';
import { exportStatisticsPDF } from '../../utils/files/export_statistics.mjs';
import { exportTeachingHistory } from '../../utils/files/export_teaching_history.mjs';
import * as userUtils from '../../utils/user/user_utils.mjs';
import subjectsModel from '../../models/entities/subjects_model.mjs';
import groupModel from '../../models/entities/group_model.mjs';
import studentsModel from '../../models/users/students_model.mjs';

export const createGroup = async(req, res) => {
    try{
        const { 
            periodo, 
            numeroGrupo,
            materia,
            unidades
        } = req.body;

        const id = await userUtils.getUserIdFromCookie(req);
        const [materiaId, carrera] = materia.split('|');

        const newGroup = new groupModel({
            periodo : periodo,
            carrera : carrera,
            grupoActivo : true,
            numeroGrupo : numeroGrupo,
            materia : materiaId,
            docente : id,
            unidades : unidades,
            listaAlumnos : null
        });

        await newGroup.save();

        return res.status(200).json({
            success : true,
            message : 'Grupo registrado',
        });
    }catch(error){
        handleServerError(res, error);
    }
}

export const allGroups = async(req, res) => {
    try {
        const searchQuery = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;
        const id = await userUtils.getUserIdFromCookie(req);
        const groups = await groupModel.find({ docente: id, grupoActivo : true });
        const idSubjects = groups.map(group => group.materia);

        let matchQuery = { "materias._id": { $in: idSubjects } };
        if (searchQuery) {
            matchQuery["$or"] = [
                {"materias.nombreMateria": {$regex: searchQuery, $options: 'i'}},
                {"materias.claveMateria": {$regex: searchQuery, $options: 'i'}}
            ];
        }
        const subjectsAggregateQuery = [
            { $unwind: "$materias" },
            { $match: matchQuery },
            { $sort: { "materias.nombreMateria": 1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
                $project: {
                    _id: "$materias._id",
                    nombreMateria: "$materias.nombreMateria",
                    claveMateria: "$materias.claveMateria",
                    semestreMateria: "$materias.semestreMateria",
                    descripcionMateria: "$materias.descripcionMateria"
                }
            }
        ];
        const subjects = await subjectsModel.aggregate(subjectsAggregateQuery);
        const total = await subjectsModel.countDocuments(matchQuery);
        return res.status(200).json({
            success: true,
            currentPage: page,
            pageSize: pageSize,
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
            groups: groups,
            subjects: subjects
        });
    } catch (error) {
        handleServerError(res, error);
    }
}

export const groupHistory = async(req, res) => {
    try {
        const searchQuery = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;
        const id = await userUtils.getUserIdFromCookie(req);
        const groups = await groupModel.find({ docente: id, grupoActivo : false });
        const idSubjects = groups.map(group => group.materia);
        let matchQuery = { "materias._id": { $in: idSubjects } };
        if (searchQuery) {
            matchQuery["$or"] = [
                {"materias.nombreMateria": {$regex: searchQuery, $options: 'i'}},
                {"materias.claveMateria": {$regex: searchQuery, $options: 'i'}}
            ];
        }

        const subjectsAggregateQuery = [
            { $unwind: "$materias" },
            { $match: matchQuery },
            { $sort: { "materias.nombreMateria": 1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
                $project: {
                    _id: "$materias._id",
                    nombreMateria: "$materias.nombreMateria",
                    claveMateria: "$materias.claveMateria",
                    semestreMateria: "$materias.semestreMateria",
                    descripcionMateria: "$materias.descripcionMateria"
                }
            }
        ];
        const subjects = await subjectsModel.aggregate(subjectsAggregateQuery);
        const total = await subjectsModel.countDocuments(matchQuery);
        return res.status(200).json({
            success: true,
            currentPage: page,
            pageSize: pageSize,
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
            groups: groups,
            subjects: subjects
        });
    } catch (error) {
        handleServerError(res, error);
    }
}

export const infoGroup = async(req, res) => {
    try{
        const group = await groupModel.findById(req.params.id);
        const idSubject = group.materia;
        const students = await studentsModel.findById(group.listaAlumnos);

        const subject = await subjectsModel.aggregate([
            { $unwind: "$materias" },
            { $match: { "materias._id": idSubject  } },
            {
                $project: {
                    _id: "$materias._id",
                    nombreMateria: "$materias.nombreMateria",
                    claveMateria: "$materias.claveMateria",
                    semestreMateria: "$materias.semestreMateria",
                    descripcionMateria: "$materias.descripcionMateria"
                }
            }
        ]);
        
        return res.status(200).json({
            success : true,
            group : group,
            subject : subject,
            students : students
        });

    }catch(error){
        handleServerError(res, error);
    }
}

export const unitsGroup = async(req, res) => {
    try{
        const group = await groupModel.findById(req.params.id);

        const units = group.unidades.length;
        
        return res.status(200).json({
            success : true,
            units : units,
        });

    }catch(error){
        handleServerError(res, error);
    }
}

export const closeGroup = async(req, res) => {
    try{
        const modifyGroup = await groupModel.findByIdAndUpdate(req.params.id, { grupoActivo : false }, {new : true});
        
        if(modifyGroup){
            return res.status(200).json({
                success : true,
                message : 'El grupo ha sido cerrado',
            });
        }else{
            return res.status(400).json({
                success : false,
                message : 'Error al cerrar el grupo, intenta de nuevo.',
            });
        }

    }catch(error){
        handleServerError(res, error);
    }
}

export const exportGroupsByTeacher = async(req, res) => {
    try{
        const id = await userUtils.getUserIdFromCookie(req);
        const teacher = await userUtils.getUserById(id);
        const groups = await groupModel.find({docente : id, grupoActivo : false});
        const idSubjects = groups.map( group => group.materia);
        const subjects = await subjectsModel.aggregate([
            { $unwind: "$materias" },
            { $match: { "materias._id": { $in: idSubjects } } },
            {
                $project: {
                    _id: "$materias._id",
                    nombreMateria: "$materias.nombreMateria",
                    claveMateria: "$materias.claveMateria",
                    semestreMateria: "$materias.semestreMateria",
                    descripcionMateria: "$materias.descripcionMateria"
                }
            }
        ]);

        const buffer = await exportTeachingHistory(groups, subjects, teacher);
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="historial_grupos.pdf"',
            'Content-Length': buffer.length
        });
        res.end(buffer); 
    }catch(error){
        handleServerError(res, error);
    }
}

export const generateReport = async(req, res) => {
    try{
        const files = req.files;

        const group = await groupModel.findById(req.params.id);
        if(!group){
            return res.status(404).json({
                success : false,
                message : 'Grupo no encontrado'
            });
        }
        const subject = await subjectsModel.aggregate([
            { $unwind: "$materias" },
            { $match: { "materias._id": group.materia  } },
            {
                $project: {
                    _id: "$materias._id",
                    nombreMateria: "$materias.nombreMateria",
                    claveMateria: "$materias.claveMateria",
                    semestreMateria: "$materias.semestreMateria",
                    descripcionMateria: "$materias.descripcionMateria"
                }
            }
        ]);
        const teacher = await userUtils.getUserById(group.docente);
        const students = await studentsModel.findById(group.listaAlumnos);
        const totalStudents = students.alumnos.length;
        const buffer = await exportStatisticsPDF(group, subject, teacher, totalStudents, files);
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="estadisticas.pdf"',
            'Content-Length': buffer.length
        });
        res.end(buffer); 

    }catch(error){
        console.error('Error in generateReport:', error);
        handleServerError(res, error);
    }
}