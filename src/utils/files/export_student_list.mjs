import pdfMake from "pdfmake/build/pdfmake.js";
import pdfFonts from "pdfmake/build/vfs_fonts.js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDateAndTime } from '../date/date_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_PATH = path.join(__dirname, "../../assets");
const FONTS_PATH = path.join(ASSETS_PATH, "fonts");
const IMAGES_PATH = ASSETS_PATH;

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const convertImageToBase64URL = (absolutePath, imageType = "png") => {
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Image not found: ${absolutePath}`);
    }

    const buffer = fs.readFileSync(absolutePath);
    return `data:image/${imageType};base64,${buffer.toString("base64")}`;
};

const convertBufferToBase64URL = (buffer, imageType = "png") =>
    `data:image/${imageType};base64,${Buffer.from(buffer).toString("base64")}`;

function setupFonts() {
    const fontFiles = [
        "Montserrat-Black.ttf",
        "Montserrat-BlackItalic.ttf",
        "Montserrat-Bold.ttf",
        "Montserrat-BoldItalic.ttf",
        "Montserrat-ExtraBold.ttf",
        "Montserrat-ExtraBoldItalic.ttf",
        "Montserrat-ExtraLight.ttf",
        "Montserrat-ExtraLightItalic.ttf",
        "Montserrat-Italic.ttf",
        "Montserrat-Light.ttf",
        "Montserrat-LightItalic.ttf",
        "Montserrat-Medium.ttf",
        "Montserrat-MediumItalic.ttf",
        "Montserrat-Regular.ttf",
        "Montserrat-SemiBold.ttf",
        "Montserrat-SemiBoldItalic.ttf",
        "Montserrat-Thin.ttf",
        "Montserrat-ThinItalic.ttf"
    ];

    fontFiles.forEach(font => {
        const fontPath = path.join(FONTS_PATH, font);

        if (!fs.existsSync(fontPath)) {
            throw new Error(`Font not found: ${fontPath}`);
        }

        pdfMake.vfs[font] = fs.readFileSync(fontPath).toString("base64");
    });
}

setupFonts();

pdfMake.fonts = {
    Montserrat: {
        normal: "Montserrat-Regular.ttf",
        bold: "Montserrat-Bold.ttf",
        italics: "Montserrat-Italic.ttf",
        bolditalics: "Montserrat-BoldItalic.ttf"
    }
};

function getHeaderAndLogos(subject, teacher, group, unit, percentages, totalStudents) {
    const assetsDir = path.resolve(__dirname, "../assets");

    return [
        {
            columns: [
                {
                    image: convertImageToBase64URL(
                        path.join(IMAGES_PATH, "tnm_logo.png")
                    ),
                    fit: [100, 100]
                },
                {
                    image: convertImageToBase64URL(
                        path.join(IMAGES_PATH, "itc.png")
                    ),
                    fit: [60, 100],
                    alignment: "right"
                }
            ]
        },
        { text: "INSTITUTO TECNOLÓGICO DE CUAUTLA", style: "mainHeader" },
        {
            text:
                "SISTEMA WEB DE MONITOREO EDUCATIVO ENFOCADO A ÍNDICES DE REPROBACIÓN Y DESERCIÓN ESCOLAR",
            style: "header",
        },
        {
            columns: [
                {
                    width: "80%",
                    stack: [
                        {
                            text: [
                                "DEPARTAMENTO: ",
                                { text: group.carrera, bold: true },
                            ],
                        },
                        {
                            text: [
                                "MATERIA: ",
                                { text: subject[0].nombreMateria, bold: true },
                            ],
                        },
                        {
                            text: [
                                "PROFESOR: ",
                                { text: teacher.nombre, bold: true },
                            ],
                        },
                        {
                            text: [
                                "PERIODO: ",
                                { text: group.periodo, bold: true },
                            ],
                        },
                    ],
                },
                {
                    width: "25%",
                    stack: [
                        {
                            text: [
                                "GRUPO: ",
                                { text: group.numeroGrupo, bold: true },
                            ],
                        },
                        {
                            text: [
                                "UNIDAD: ",
                                { text: unit, bold: true },
                            ],
                        },
                        {
                            text: [
                                "CLAVE: ",
                                { text: subject[0].claveMateria, bold: true },
                            ],
                        },
                        {
                            text: [
                                "ALUMNOS: ",
                                {
                                    text: totalStudents,
                                    bold: true,
                                    decoration: "underline",
                                },
                            ],
                        },
                    ],
                },
            ],
            style: "text",
        },
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

function generateFinalTable(percentages, totalStudents) {
    const rows = [
        ["Alumnos aprobados", percentages.aprobados, percentages.aprobadosPorcentaje],
        ["Alumnos reprobados", percentages.reprobados, percentages.reprobadosPorcentaje],
        ["Alumnos desertados", percentages.desertados, percentages.desertadosPorcentaje],
        ["Total", totalStudents, "100%"],
    ];

    return {
        table: {
            widths: ["*", "15%", "15%"],
            body: rows.map(row =>
                row.map(cell => ({ text: cell, style: "tableData" }))
            ),
        },
        margin: [0, 25, 0, 0],
    };
}

function generateFooter(fecha) {
    return [
        {
            text: '________________________________________',
            margin: [0, 50, 0, 10],
            style: 'tableData',
            alignment: 'center'
        },
        {
            text: 'Firma del profesor',
            margin: [0, 0, 0, 10],
            style: 'tableData',
            alignment: 'center'
        },
        {
            text: 'Este documento no es válido si tiene tachaduras o enmendaduras',
            style: 'tableData',
            alignment: 'center'
        },
        {
            text: `Yecapixtla, Morelos a ${fecha}`,
            style: 'tableData',
            alignment: 'center'
        }
    ];
}

export async function exportStudentList(
    group,
    subject,
    teacher,
    students,
    unit,
    percentages,
    totalStudents
) {
    const { fecha } = await getDateAndTime();
    const unitValue = unit ?? 0;
    const activities = getActivityHeaders(students);
    const headers = ["No.", "Nombre", ...activities.map((_, i) => `Act${i + 1}`), "Promedio"];

    return new Promise(resolve => {
        const docDefinition = {
            content: [],
            styles: {
                mainHeader: { fontSize: 12, bold: true, alignment: 'center', margin: [0, 10, 0, 10] },
                header: { fontSize: 12, bold: true, alignment: 'justify', margin: [0, 0, 0, 10] },
                tableHeader: { fontSize: 10, bold: true, color: '#FFF', fillColor: '#18316B', alignment: 'center' },
                tableDataName: { fontSize: 8, alignment: 'left' },
                tableData: { fontSize: 8, alignment: 'center' },
                text: { fontSize: 10, margin: [0, 0, 0, 10] }
            },
            defaultStyle: { font: 'Montserrat' },
            footer: page => ({
                text: page.toString(),
                alignment: 'right',
                margin: [0, 0, 40, 30]
            })
        };

        docDefinition.content.push(
            ...getHeaderAndLogos(subject, teacher, group, unitValue, percentages, totalStudents)
        );

        students.forEach((student, index) => {
            if (index % 30 === 0) {
                if (index !== 0) {
                    docDefinition.content.push({ text: "", pageBreak: "before" });
                    docDefinition.content.push(
                        ...getHeaderAndLogos(subject, teacher, group, unitValue, percentages, totalStudents)
                    );
                }

                docDefinition.content.push({
                    table: {
                        headerRows: 1,
                        widths: ["5%", "*", ...activities.map(() => "auto"), "15%"],
                        body: [headers.map(h => ({ text: h, style: "tableHeader" }))],
                    },
                });
            }

            const promedio =
                student.calificaciones.reduce((acc, cur) => acc + (cur.promedioUnidad || 0), 0) /
                student.calificaciones.length;

            docDefinition.content.at(-1).table.body.push([
                { text: index + 1, style: "tableData" },
                { text: student.nombre, style: "tableDataName" },
                ...activities.map(act => {
                    const found = student.calificaciones
                        .flatMap(c => c.actividades)
                        .find(a => a.nombreActividad === act);
                    return { text: found ? found.calificacionActividad : "-", style: "tableData" };
                }),
                { text: promedio.toFixed(2), style: "tableData" },
            ]);
        });

        docDefinition.content.push(generateFinalTable(percentages, totalStudents));
        docDefinition.content.push(generateFooter(fecha));

        pdfMake.createPdf(docDefinition).getBuffer(buffer => resolve(buffer));
    });
}