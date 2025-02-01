import pdfMake from "pdfmake/build/pdfmake.js";
import pdfFonts from "pdfmake/build/vfs_fonts.js";
import fs from "node:fs";
import path from "node:path";
import { getDateAndTime } from '../date/date_utils.mjs';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const convertImageToBase64URL = (filename, imageType = 'png') => {
    try {
        const buffer = fs.readFileSync(filename);
        const base64String = Buffer.from(buffer).toString('base64');
        return `data:image/${imageType};base64,${base64String}`;
    } catch (error) {
        throw new Error(`File ${filename} does not exist`);
    }
};

function setupFonts() {
    const fontFiles = [
        'Montserrat-Regular.ttf', 'Montserrat-Bold.ttf', 'Montserrat-Italic.ttf', 'Montserrat-BoldItalic.ttf'
    ];
    fontFiles.forEach(font => {
        const fontPath = path.resolve('../api_server/src/assets/fonts', font);
        pdfMake.vfs[font] = fs.readFileSync(fontPath).toString('base64');
    });
}

setupFonts();

pdfMake.fonts = {
    Montserrat: {
        normal: 'Montserrat-Regular.ttf',
        bold: 'Montserrat-Bold.ttf',
        italics: 'Montserrat-Italic.ttf',
        bolditalics: 'Montserrat-BoldItalic.ttf'
    }
};

function getHeaderAndLogos(subject, teacher, group, unit, percentages, totalStudents) {
    return [
        {
            columns: [
                { image: convertImageToBase64URL('../api_server/src/assets/tnm_logo.png'), fit: [100, 100] },
                { image: convertImageToBase64URL('../api_server/src/assets/itc.png'), fit: [60, 100], alignment: 'right' }
            ]
        },
        { text: 'INSTITUTO TECNOLÓGICO DE CUAUTLA', style: 'mainHeader' },
        { text: 'SISTEMA WEB DE MONITOREO EDUCATIVO ENFOCADO A ÍNDICES DE REPROBACIÓN Y DESERCIÓN ESCOLAR', style: 'header' },
        {
            columns: [
                {
                    width: '85%',
                    stack: [
                        {
                            text: [
                                `DEPARTAMENTO: `,
                                { text: group.carrera, bold: true, style: 'text' }
                            ]
                        },
                        {
                            text: [
                                `MATERIA: `,
                                { text: subject[0].nombreMateria, bold: true, style: 'text' }
                            ]
                        },
                        {
                            text: [
                                `PROFESOR: `,
                                { text: teacher.nombre, bold: true, style: 'text' }
                            ]
                        },
                        {
                            text: [
                                `PERIODO: `,
                                { text: group.periodo, bold: true, style: 'text' }
                            ]
                        }
                    ]
                },
                {
                    width: '15%',
                    stack: [
                        {
                            text: [
                                `GRUPO: `,
                                { text: group.numeroGrupo, bold: true, style: 'text' }
                            ]
                        },
                        {
                            text: [
                                `UNIDAD: `,
                                { text: unit, bold: true, style: 'text' }
                            ]
                        },
                        {
                            text: [
                                `CLAVE: `,
                                { text: subject[0].claveMateria, bold: true, style: 'text' }
                            ]
                        },
                        {
                            text: [
                                `ALUMNOS: `,
                                { text: totalStudents, bold: true, decoration: 'underline', style: 'text' }
                            ]
                        }
                    ]
                }
            ],
            style: 'text'
        }
    ];
}

function getActivityHeaders(students) {
    const activitySet = new Set();
    students.forEach(student => {
        student.calificaciones.forEach(unit => {
            unit.actividades.forEach(activity => {
                activitySet.add(activity.nombreActividad);
            });
        });
    });
    return Array.from(activitySet).sort();
}

function generateFinalTable(percentages, totalStudents){
    const tableBody = [
        ['Alumnos aprobados', percentages.aprobados, percentages.aprobadosPorcentaje],
        ['Alumnos reprobados', percentages.reprobados, percentages.reprobadosPorcentaje],
        ['Alumnos desertados', percentages.desertados, percentages.desertadosPorcentaje],
        ['Total', totalStudents, '100%'],
    ];
    
    return {
        table: {
            headerRows: 1,
            widths: ['auto', '10%', '10%'], 
            body: [
                ...tableBody.map(row => row.map(cell => ({text: cell, style: 'tableData'})))
            ],
        },
        margin: [0, 24, 0, 0],
    };
}

function generateFooter(fecha){
    return [
        { text: '________________________________________', margin: [0, 50, 0, 10], style: 'tableData' },
        { text: 'Firma del profesor', margin: [0, 0, 0, 10], style: 'tableData' }, 
        { text: 'Este documento no es válido si tiene tachaduras o enmendaduras', margin: [0, 0, 0, 10], style: 'tableData' }, 
        { text: `Yecapixtla, Morelos a ${fecha}`, margin: [0, 0, 0, 10], style: 'tableData' }, 
    ];
}

export async function exportStudentList(group, subject, teacher, students, unit, percentages, totalStudents){
    return new Promise(async (resolve, reject) => {
        const { fecha, hora } = await getDateAndTime();
        const unitValue = unit || 0; 
        const activities = getActivityHeaders(students);
        const headers = ['No.', 'Nombre', ...activities.map((_, i) => `Act${i+1}`), 'Promedio'];

        const docDefinition = {
            content: [],
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        {
                            text: currentPage.toString(),
                            alignment: 'right',
                            margin: [0, 0, 40, 30]
                        }
                    ]
                };
            },
            styles: {
                mainHeader: {fontSize: 12, bold: true, alignment: 'center', margin: [0, 10, 0, 10], font: 'Montserrat'},
                header: {fontSize: 12, bold: true, alignment: 'justify', margin: [0, 0, 0, 10], font: 'Montserrat'},
                tableHeader: {fontSize: 10, bold: true, color: '#FFFFFF', fillColor: '#18316B', alignment: 'center'},
                tableDataName: { fontSize: 8, alignment: 'left', font: 'Montserrat' },
                tableData: {fontSize: 8, alignment: 'center', font: 'Montserrat'},
                text: {fontSize: 10, alignment: 'left', margin: [0, 0, 0, 10], font: 'Montserrat'}
            },
            defaultStyle: {
                font: 'Montserrat'
            }
        };

        docDefinition.content.push(...getHeaderAndLogos(subject, teacher, group, unitValue, percentages, totalStudents));

        students.forEach((student, index) => {
            if (index % 30 === 0 && index !== 0) {
                docDefinition.content.push({text: '', pageBreak: 'before'});
                docDefinition.content.push(...getHeaderAndLogos(subject, teacher, group, unitValue, percentages, totalStudents));
            }
            const studentData = [
                {text: index + 1, style: 'tableData'},
                {text: student.nombre, style: 'tableDataName'},
                ...activities.map(activity => {
                    const act = student.calificaciones.flatMap(cal => cal.actividades).find(a => a.nombreActividad === activity);
                    return {text: act ? act.calificacionActividad : '-', style: 'tableData'};
                }),
                {text: (student.calificaciones.reduce((acc, cur) => acc + (cur.promedioUnidad || 0), 0) / student.calificaciones.length).toFixed(2), style: 'tableData'}
            ];
            if(index % 30 === 0) {
                docDefinition.content.push({
                    table: {
                        headerRows: 1,
                        widths: ['5%', '*', ...activities.map(() => 'auto'), '15%'],
                        body: [headers.map(header => ({text: header, style: 'tableHeader'})), studentData]
                    }
                });
            } else {
                docDefinition.content[docDefinition.content.length - 1].table.body.push(studentData);
            }
        });

        docDefinition.content.push(generateFinalTable(percentages, totalStudents));
        docDefinition.content.push(generateFooter(fecha));

        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer(buffer => {
            resolve(buffer);
        });
    });
}