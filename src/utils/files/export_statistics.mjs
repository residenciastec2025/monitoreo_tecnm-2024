import pdfMake from "pdfmake/build/pdfmake.js";
import pdfFonts from "pdfmake/build/vfs_fonts.js";
import fs from "node:fs";
import path from "node:path";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const convertImageToBase64URL = (filename, imageType = 'png') => {
    try {
      const buffer = fs.readFileSync(filename);
      const base64String = Buffer.from(buffer).toString('base64');
      return `data:image/${imageType};base64,${base64String}`;
    } catch (error) {
      throw new Error(`file ${filename} no exist`);
    }
}

const convertBufferToBase64URL = (buffer, imageType = 'png') => {
    try {
      const base64String = Buffer.from(buffer).toString('base64');
      return `data:image/${imageType};base64,${base64String}`;
    } catch (error) {
      throw new Error('Error processing buffer');
    }
}

function setupFonts() {
    const fontFiles = [
        'Montserrat-Black.ttf', 'Montserrat-BlackItalic.ttf',
        'Montserrat-Bold.ttf', 'Montserrat-BoldItalic.ttf',
        'Montserrat-ExtraBold.ttf', 'Montserrat-ExtraBoldItalic.ttf',
        'Montserrat-ExtraLight.ttf', 'Montserrat-ExtraLightItalic.ttf',
        'Montserrat-Italic.ttf', 'Montserrat-Light.ttf',
        'Montserrat-LightItalic.ttf', 'Montserrat-Medium.ttf',
        'Montserrat-MediumItalic.ttf', 'Montserrat-Regular.ttf',
        'Montserrat-SemiBold.ttf', 'Montserrat-SemiBoldItalic.ttf',
        'Montserrat-Thin.ttf', 'Montserrat-ThinItalic.ttf'
    ];
    fontFiles.forEach(font => {
        try {
            const fontPath = path.resolve('../api_server/src/assets/fonts', font);
            pdfMake.vfs[font] = fs.readFileSync(fontPath).toString('base64');
        } catch (error) {
            console.error(`Error loading font file ${font}:`, error);
            throw error; // Re-throw to handle it further up if necessary
        }
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

export async function exportStatisticsPDF(group, subject, teacher, students, files) {
    return new Promise((resolve, reject) => {

        const titles = [
            {
                stack : [
                    {
                        text: [
                            {text: `Gráfica 1.`, bold: true},
                            ' Estado de alumnos por unidades '
                        ]
                    }
                ], 
                style : 'statisticsTitle'
            }, 
            {
                stack : [
                    {
                        text: [
                            {text: `Gráfica 2.`, bold: true},
                            ' Rango de promedios'
                        ]
                    }
                ], 
                style : 'statisticsTitle'
            }, 
            {
                stack : [
                    {
                        text: [
                            {text: `Gráfica 3.`, bold: true},
                            ' Estado final de los alumnos '
                        ]
                    }
                ], 
                style : 'statisticsTitle'
            }
        ];
        const descriptions = [
            "Representación gráfica de estudiantes aprobados, reprobados y desertores a lo largo del semestre.",
            "Visualización de los promedios finales de los estudiantes divididos por rango de calificación.",
            "Representación gráfica de estudiantes aprobados, reprobados y desertores al finalizar el semestre."
        ];

        const images = files.map((file, index) => {
            return [
                { text: titles[index].stack, style: 'statisticsTitle' },
                { text: descriptions[index], style: 'statisticsText' },
                {
                    image: `data:image/png;base64,${Buffer.from(file.buffer).toString('base64')}`,
                    width : 520,
                    height : 200,
                    alignment: 'center'
                }
            ];
        }).flat();

        const docDefinition = {
            content: [
                {
                    columns: [
                        {
                            image: convertImageToBase64URL('../api_server/src/assets/tnm_logo.png'),
                            fit: [100, 100]
                        },
                        {
                            image: convertImageToBase64URL('../api_server/src/assets/itc.png'),
                            fit: [60, 100],
                            alignment : 'right'
                        },
                    ]
                },
                { text: 'INSTITUTO TECNOLÓGICO DE CUAUTLA', style: 'mainHeader' },
                { text: 'SISTEMA WEB DE MONITOREO EDUCATIVO ENFOCADO A ÍNDICES DE REPROBACIÓN Y DESERCIÓN ESCOLAR', style: 'header' },
                {
                    columns: [
                        {
                            width: '75%',
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
                            width: '25%',
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
                },
                {
                    stack : [
                        {
                            text: [
                                {text: `Tabla 1.`, bold: true},
                                ' Distribución de resultados académicos por unidad'
                            ]
                        }
                    ], 
                    style : 'textTable'
                },
                { text: `La siguiente tabla detalla el número de estudiantes que aprobaron, reprobaron o desertaron en cada unidad y al final del curso `, style: 'statisticsText' },
                {
                    style: 'tableBody',
                    table: {
                        widths: ['25%', '25%', '25%', '25%'], 
                        body: [
                            [
                                { text: 'Unidad', style: 'tableHeader' },
                                { text: 'Aprobados', style: 'tableHeader' },
                                { text: 'Reprobados', style: 'tableHeader' },
                                { text: 'Desertores', style: 'tableHeader' }
                            ],
                            ...group.unidades.map(unidad => [`Unidad ${unidad.unidad}`, `${unidad.alumnosAprobados}`, `${unidad.alumnosReprobados}`, `${unidad.alumnosDesertados}`]),
                            [`Final`, `${group.alumnosAprobados}`, `${group.alumnosReprobados}`, `${group.alumnosDesertados}`]
                        ]
                    },
                    layout: {
                        fillColor: function (rowIndex, node, columnIndex) {
                            return (rowIndex === 0) ? '#18316B' : null;
                        },
                        defaultBorder : true
                    }
                },
                { text: '', pageBreak: 'after' },
                {
                    columns: [
                        {
                            image: convertImageToBase64URL('../api_server/src/assets/tnm_logo.png'),
                            fit: [100, 100]
                        },
                        {
                            image: convertImageToBase64URL('../api_server/src/assets/itc.png'),
                            fit: [60, 100],
                            alignment : 'right'
                        },
                    ]
                },
                { text: 'INSTITUTO TECNOLÓGICO DE CUAUTLA', style: 'mainHeader' },
                { text: 'SISTEMA WEB DE MONITOREO EDUCATIVO ENFOCADO A ÍNDICES DE REPROBACIÓN Y DESERCIÓN ESCOLAR', style: 'header' },
                ...images,
            ],
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        {
                            // This text could be dynamically created using currentPage and pageCount
                            text: currentPage.toString(),
                            alignment: 'right',  // Right align text
                            margin: [0, 0, 40, 30]  // Margin [left, top, right, bottom]
                        }
                    ]
                };
            },            
            styles: {
                mainHeader: {fontSize: 12, bold: true, alignment: 'center', margin: [0, 10, 0, 10], font: 'Montserrat'},
                header: {fontSize: 12, bold: true, alignment: 'justify', margin: [0, 0, 0, 10], font: 'Montserrat'},
                tableHeader: {fontSize: 10, bold: true, color: '#FFFFFF', fillColor: '#18316B', alignment: 'center'},
                text: {fontSize: 10, alignment: 'left', margin: [0, 0, 0, 10], font: 'Montserrat'},
                textTable: {fontSize: 12, alignment: 'left', margin: [0, 0, 0, 0], font: 'Montserrat'},
                statisticsTitle : {
                    fontSize: 12,
                    alignment: 'justify',
                    margin: [0, 10, 0, 0],
                    font: 'Montserrat'
                },
                statisticsText : {
                    fontSize: 12,
                    alignment: 'justify',
                    margin: [0, 10, 0, 12],
                    font: 'Montserrat'
                },
                tableBody: {
                    margin: [0, 0, 0, 0],
                    fontSize: 10,
                    font: 'Montserrat',
                    alignment : 'center',
                },
            },
            defaultStyle: {
                font: 'Montserrat'
            }
        };
        
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer) => {
            resolve(buffer);
        });   
    });
}
