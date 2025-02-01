import studentsModel from '../../models/users/students_model.mjs';
import groupModel from '../../models/entities/group_model.mjs';

export async function updateUnits(id){
    try{
        // Obtener el id del grupo y buscar la información
        const group = await groupModel.findById(id);
        if(!group){
            console.error('Error al buscar el grupo');
        }

        const students = await studentsModel.findById(group.listaAlumnos);

        students.alumnos.forEach(student => {
            student.calificaciones = [];

            group.unidades.forEach(unit => {
                const activities = unit.actividades.map(activity => {
                    return {
                        nombreActividad: activity.nombre,
                        calificacionActividad: 0,
                    };
                });

                student.calificaciones.push({
                    unidad: unit.unidad,
                    actividades: activities,
                    promedioUnidad: 0
                });
            });
        });

        await students.save();

        // Devuelve los datos actualizados
        return {
            success: true,
            message: 'Información actualizada',
            group: group,
            students: students
        };

    } catch(error){
        console.log(error);
        throw error;
    }
}

export async function calculateAverages(id) {
    try {
        const group = await groupModel.findById(id);
        if (!group) {
            throw new Error('El grupo no existe');
        }

        const students = await studentsModel.findById(group.listaAlumnos);
        if (!students) {
            throw new Error('La lista de alumnos no existe');
        }

        let totalPromedioFinal = 0;

        // Inicializar los contadores para cada unidad
        for (const unidad of group.unidades) {
            unidad.alumnosAprobados = 0;
            unidad.alumnosReprobados = 0;
            unidad.alumnosDesertados = 0;
        }

        // Iterar sobre cada alumno
        for (const alumno of students.alumnos) {
            let promedioAlumno = 0;

            // Iterar sobre las calificaciones de cada unidad
            for (const calificacion of alumno.calificaciones) {
                let sumaPonderada = 0;
                let totalPonderacion = 0;

                // Buscar las actividades correspondientes a esta unidad en el modelo de grupo
                const unidad = group.unidades.find(u => u.unidad === calificacion.unidad);

                if (unidad) {
                    const actividadesMap = new Map();
                    for (const actividad of unidad.actividades) {
                        actividadesMap.set(actividad.nombre, actividad.porcentaje);
                    }

                    for (const actividad of calificacion.actividades) {
                        const porcentaje = actividadesMap.get(actividad.nombreActividad);

                        if (porcentaje) {
                            sumaPonderada += (actividad.calificacionActividad * porcentaje) / 100;
                            totalPonderacion += porcentaje;
                        }
                    }

                    const promedioUnidad = totalPonderacion > 0 ? parseFloat((sumaPonderada / totalPonderacion * 100).toFixed(2)) : 0;
                    calificacion.promedioUnidad = promedioUnidad;
                    promedioAlumno += promedioUnidad;

                    // Actualizar contadores de aprobados, reprobados, desertados
                    if (promedioUnidad >= 70 && promedioUnidad <= 100) {
                        unidad.alumnosAprobados += 1;
                    } else if (promedioUnidad > 0 && promedioUnidad < 70) {
                        unidad.alumnosReprobados += 1;
                    } else {
                        unidad.alumnosDesertados += 1;
                    }
                }
            }

            const promedioFinalAlumno = alumno.calificaciones.length > 0 ? parseFloat((promedioAlumno / alumno.calificaciones.length).toFixed(2)) : 0;
            alumno.promedioFinal = promedioFinalAlumno;
            totalPromedioFinal += promedioFinalAlumno;
        }

        const promedioFinalGrupo = students.alumnos.length > 0 ? parseFloat((totalPromedioFinal / students.alumnos.length).toFixed(2)) : 0;
        students.promedioFinal = promedioFinalGrupo;

        // Guardar los cambios en el modelo de estudiantes y grupo
        await students.save();
        await group.save();

        return 'Promedios calculados exitosamente';

    } catch (error) {
        throw new Error('Error al actualizar los promedios');
    }
}


export async function calculateGeneralAverages(id){
    try{
        const group = await getGroup(id);
        const students = await getStudents(group);
        const studentsTotal = students.alumnos.length;

        // Calcular y actualizar estadisticas por unidad del grupo y estudiantes
        const unitStatistics = {};
        students.alumnos.forEach(student => {
            // Iterar sobre las calificaciones de cada alumno
            student.calificaciones.forEach(calificacion => {
                const unit = calificacion.unidad;
                const averageUnit = calificacion.promedioUnidad;
            
                // Inicializar el objeto de estadísticas de unidad si aún no existe
                if (!unitStatistics[unit]) {
                    unitStatistics[unit] = {
                        reprobados: 0,
                        aprobados: 0,
                        desertores: 0
                    };
                }

                // Incrementar el contador correspondiente según el promedio de la unidad
                if (averageUnit > 0 && averageUnit < 70) {
                    unitStatistics[unit].reprobados++;
                } else if (averageUnit >= 70 && averageUnit <= 100) {
                    unitStatistics[unit].aprobados++;
                } else {
                    unitStatistics[unit].desertores++;
                }
            });
        });
        const units = Object.values(unitStatistics);
        //Guardar la informacion en el grupo
        group.unidades.forEach((unidad, index) => {
            const unitData = units[index];
            unidad.alumnosAprobados = unitData.aprobados;
            unidad.alumnosReprobados = unitData.reprobados;
            unidad.alumnosDesertados = unitData.desertores;
        });
        await group.save();

        // Calcular y actualizar promedio final grupal
        const finalAverageGroup = students.alumnos.
        reduce((acum, student) => acum + student.promedioFinal, 0) / studentsTotal;
        await groupModel.findByIdAndUpdate(id, {promedioGeneral : finalAverageGroup.toFixed(2)}, {new : true});

        // Contabilizar alumnos reprobados, aprobados y desertores por promedio final, ademas de 
        // separarlos por rango de calificaciones
        let final = {
            reprobados : 0,
            aprobados : 0,
            desertores : 0
        };
        let averageRange = {
            Rango_0_9 : 0,
            Rango_10_19 : 0,
            Rango_20_29 : 0,
            Rango_30_39 : 0,
            Rango_40_49 : 0,
            Rango_50_59 : 0,
            Rango_60_69 : 0,
            Rango_70_79 : 0,
            Rango_80_89 : 0,
            Rango_90_100 : 0,
        }
        students.alumnos.forEach(student => {
            if(student.promedioFinal > 0 && student.promedioFinal < 70){
                final.reprobados++;
            }else if(student.promedioFinal >= 70 && student.promedioFinal <= 100){
                final.aprobados++;
            }else{
                final.desertores++;
            }
        });
        students.alumnos.forEach(student => {
            const promedioFinal = student.promedioFinal;
            if (promedioFinal >= 0 && promedioFinal < 10) {
                averageRange.Rango_0_9++;
            } else if (promedioFinal >= 10 && promedioFinal < 20) {
                averageRange.Rango_10_19++;
            } else if (promedioFinal >= 20 && promedioFinal < 30) {
                averageRange.Rango_20_29++;
            } else if (promedioFinal >= 30 && promedioFinal < 40) {
                averageRange.Rango_30_39++;
            } else if (promedioFinal >= 40 && promedioFinal < 50) {
                averageRange.Rango_40_49++;
            } else if (promedioFinal >= 50 && promedioFinal < 60) {
                averageRange.Rango_50_59++;
            } else if (promedioFinal >= 60 && promedioFinal < 70) {
                averageRange.Rango_60_69++;
            } else if (promedioFinal >= 70 && promedioFinal < 80) {
                averageRange.Rango_70_79++;
            } else if (promedioFinal >= 80 && promedioFinal < 90) {
                averageRange.Rango_80_89++;
            } else if (promedioFinal >= 90 && promedioFinal <= 100) {
                averageRange.Rango_90_100++;
            }
        });

        // Actualizacion de la informacion final del grupo        
        group.alumnosAprobados = final.aprobados;
        group.alumnosReprobados = final.reprobados;
        group.alumnosDesertados = final.desertores;

        group.porcentajeAprobados = ((final.aprobados * 100) / studentsTotal).toFixed(2);
        group.porcentajeReprobados = ((final.reprobados * 100) / studentsTotal).toFixed(2);
        group.porcentajeDesertados = ((final.desertores * 100) / studentsTotal).toFixed(2);
        await group.save();

        //  Porcentajes de alumnos aprobados, reprobados y que desertaron 
        let finalPercentages = {
            aprobados : '',
            reprobados : '',
            desertores : ''
        }
        finalPercentages.aprobados = `${((final.aprobados * 100) / studentsTotal).toFixed(2)}%`;
        finalPercentages.reprobados = `${((final.reprobados * 100) / studentsTotal).toFixed(2)}%`;
        finalPercentages.desertores = `${((final.desertores * 100) / studentsTotal).toFixed(2)}%`;

        //Respuesta
        return { studentsTotal, finalAverageGroup, units, final, finalPercentages, averageRange };

    }catch(error){
        console.log(error);
        throw new Error('Error al calcular estadisticas');
    }
}

export async function calculateUnitPercentages(id, unit) {
    const group = await groupModel.findById(id);
    const unitData = group.unidades[unit-1];
    const totalStudents = unitData.alumnosAprobados + unitData.alumnosReprobados + unitData.alumnosDesertados;

    let percentagesUnit = {
        aprobados : unitData.alumnosAprobados,
        reprobados : unitData.alumnosReprobados,
        desertados : unitData.alumnosDesertados,
        aprobadosPorcentaje : `${((unitData.alumnosAprobados * 100) / totalStudents).toFixed(2)}%`,
        reprobadosPorcentaje : `${((unitData.alumnosReprobados * 100) / totalStudents).toFixed(2)}%`,
        desertadosPorcentaje : `${((unitData.alumnosDesertados * 100) / totalStudents).toFixed(2)}%`,
        total : totalStudents
    }

    return percentagesUnit;
}

export async function calculateFinalPercentages(id) {
    const group = await groupModel.findById(id);
    const totalStudents = group.alumnosAprobados + group.alumnosReprobados + group.alumnosDesertados;

    let percentagesFinal = {
        aprobados : group.alumnosAprobados,
        reprobados : group.alumnosReprobados,
        desertados : group.alumnosDesertados,
        aprobadosPorcentaje : `${group.porcentajeAprobados}%`,
        reprobadosPorcentaje : `${group.porcentajeReprobados}%`,
        desertadosPorcentaje : `${group.porcentajeDesertados}%`,
        total : totalStudents
    }

    return percentagesFinal;
}

async function getGroup(id) {
    const group = await groupModel.findById(id);
    if (!group) {
        throw new Error('Grupo no encontrado');
    }
    return group;
}

async function getStudents(group) {
    const students = await studentsModel.findById(group.listaAlumnos);
    if (!students) {
        throw new Error('El grupo no tiene alumnos');
    }
    return students;
}