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

function getHeaderAndLogos(subject, teacher, group, students) {
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
                                { text: 'Final', bold: true, style: 'text' }
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
                                { text: students, bold: true, style: 'text' }
                            ]
                        }
                    ]
                }
            ],
            style: 'text'
        }
    ];
}

function generateFinalTable(percentages) {
    const tableBody = [
        ['Alumnos aprobados', percentages.aprobados, percentages.aprobadosPorcentaje],
        ['Alumnos reprobados', percentages.reprobados, percentages.reprobadosPorcentaje],
        ['Alumnos desertados', percentages.desertados, percentages.desertadosPorcentaje],
        ['Total', percentages.total, '100%'],
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

export async function exportFinalAverageList(group, subject, teacher, students, percentages, totalStudents){
    return new Promise(async (resolve, reject) => {
        const headers = ['No.', 'Nombre', ...students[0].promediosUnidad.map((_, idx) => `U ${idx + 1}`), 'Promedio'];
        const { fecha, hora } = await getDateAndTime();
        
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

        docDefinition.content.push(...getHeaderAndLogos(subject, teacher, group, totalStudents));

        students.forEach((student, index) => {
            if (index % 30 === 0 && index !== 0) {
                docDefinition.content.push({text: '', pageBreak: 'before'});
                docDefinition.content.push(...getHeaderAndLogos(subject, teacher, group, totalStudents));
            }
            const studentData = [
                {text: index + 1, style: 'tableData'},
                {text: student.nombre, style: 'tableDataName'},
                ...student.promediosUnidad.map(unitScore => ({text: unitScore.toString(), style: 'tableData'})),
                {text: student.promedioFinal.toString(), style: 'tableData'}
            ];

            if(index % 30 === 0) {
                docDefinition.content.push({
                    table: {
                        headerRows: 1,
                        widths: ['5%', '*', ...student.promediosUnidad.map(() => 'auto'), '15%'],
                        body: [headers.map(header => ({text: header, style: 'tableHeader'})), studentData]
                    }
                });
            } else {
                docDefinition.content[docDefinition.content.length - 1].table.body.push(studentData);
            }
        });

        docDefinition.content.push(generateFinalTable(percentages));
        docDefinition.content.push(generateFooter(fecha));

        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer(buffer => {
            resolve(buffer);
        });
    });
}
