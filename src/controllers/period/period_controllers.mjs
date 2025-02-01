import { handleServerError } from '../../utils/handle/handle_server.mjs';
import { getDateAndTime } from '../../utils/date/date_utils.mjs';
import { exportPeriods } from '../../utils/files/export_periods.mjs';
import * as userUtils from '../../utils/user/user_utils.mjs';
import periodModel from '../../models/entities/period_model.mjs';
import subjectsModel from '../../models/entities/subjects_model.mjs';

export const createPeriod = async(req, res) => {
    try{
        const body = req.body;
        const { fecha, hora } = await getDateAndTime();
        const id = await userUtils.getUserIdFromCookie(req);
        const user = await userUtils.getUserById(id);
        const periodDuplicate = await periodModel.find(
            {
                periodo : body.periodo,
                carrera : user.carrera,
                idReticula : body.idReticula
            }
        );
        if(periodDuplicate.length > 0){
            return res.status(400).json({
                success : false,
                message : 'Ya existe un periodo con la misma informacion'
            });
        }

        const period = new periodModel({
            periodo : body.periodo,
            carrera : user.carrera,
            idReticula : body.idReticula,
            fechaRegistro : fecha,
            horaRegistro : hora
        });
        await period.save();
        return res.status(200).json({
            success : true,
            message : 'Periodo registrado',
        });

    }catch(error){
        handleServerError(res, error);
    }
}

export const descriptionPeriodsByCareers = async(req, res) => {
    try{
        const id = await userUtils.getUserIdFromCookie(req);
        const user = await userUtils.getUserById(id);
        let careers = '';

        if(user.cuenta === 'Administrador'){
            careers = [user.carrera]
        }else if(user.cuenta === 'Docente'){
            careers = user.carreras.map(career => career.carrera);
        }

        const periods = await periodModel.distinct('periodo', { 'carrera' : {$in : careers}});

        if(!periods){
            return res.status(404).json({
                success : false,
                message : 'No hay periodos registrados'
            });
        }

        return res.status(200).json({
            success : true,
            periods : periods
        });
    }catch(error){
        handleServerError(res, error);
    }
}

export const periodsByCareer = async(req, res) => {
    try{
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;
        const id = await userUtils.getUserIdFromCookie(req);
        const user = await userUtils.getUserById(id);

        const total = await periodModel.countDocuments({ carrera: user.carrera });

        const periods = await periodModel
        .find({ carrera: user.carrera })
        .select('periodo idReticula fechaRegistro horaRegistro')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean();

        const subjectsPromises = periods.map(period => {
            return subjectsModel.findOne({ _id: period.idReticula }).select('claveReticula');
        });
        const subjectsResults = await Promise.all(subjectsPromises);

        const cleanedPeriods = periods.map(period => ({
            periodo: period.periodo,
            idReticula: period.idReticula,
            fechaRegistro: period.fechaRegistro,
            horaRegistro: period.horaRegistro
        }));
        
        const cleanedSubjects = subjectsResults.map(subject => ({
            claveReticula: subject.claveReticula
        }));
        
        return res.status(200).json({
            success: true,
            periods: cleanedPeriods,
            subjects: cleanedSubjects,
            currentPage: page,
            pageSize: pageSize,
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
        });
        
    }catch(error){
        handleServerError(res, error);
    }
}

export const exportPeriodsByCareerPDF = async(req, res) => {
    try{
        const id = await userUtils.getUserIdFromCookie(req);
        const user = await userUtils.getUserById(id);
        const periods = await periodModel.find({carrera : user.carrera}).select('periodo idReticula fechaRegistro horaRegistro');
        const subjectsPromises = periods.map(period => {
            return subjectsModel.findOne({ _id: period.idReticula }).select('claveReticula');
        });
        const subjectsResults = await Promise.all(subjectsPromises);

        const data = periods.map((period, index) => ({
            periodo: period.periodo,
            idReticula: period.idReticula,
            fechaRegistro: period.fechaRegistro,
            horaRegistro : period.horaRegistro,
            claveReticula: subjectsResults[index]?.claveReticula || 'NA',
            carrera : user.carrera
        }));
        
        const buffer = await exportPeriods(data);
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="periodos.pdf"',
            'Content-Length': buffer.length
        });
        res.end(buffer); 

    }catch(error){
        handleServerError(res, error);
    }
}