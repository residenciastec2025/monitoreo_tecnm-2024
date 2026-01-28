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

export async function exportStatisticsPDF(group, subject, teacher, students, files) {
    return new Promise((resolve, reject) => {
        try {
            const titles = [
                "Gráfica 1. Estado de alumnos por unidades",
                "Gráfica 2. Rango de promedios",
                "Gráfica 3. Estado final de los alumnos"
            ];

            const descriptions = [
                "Representación gráfica de estudiantes aprobados, reprobados y desertores a lo largo del semestre.",
                "Visualización de los promedios finales de los estudiantes divididos por rango de calificación.",
                "Representación gráfica de estudiantes aprobados, reprobados y desertores al finalizar el semestre."
            ];

            const images = files.flatMap((file, index) => [
                { text: titles[index], style: "statisticsTitle", margin: [0, 0, 0, 10] },
                { text: descriptions[index], style: "statisticsText", margin: [0, 0, 0, 10] },
                {
                    image: convertBufferToBase64URL(file.buffer),
                    width: 520,
                    height: 260,
                    alignment: "center"
                }
            ]);

            const docDefinition = {
                content: [
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
                        style: "header"
                    },
                    ...images
                ],
                styles: {
                    mainHeader: { fontSize: 12, bold: true, alignment: "center",margin: [0, 10, 0, 10] },
                    header: { fontSize: 12, bold: true, margin: [0, 0, 0, 10] },
                    statisticsTitle: { fontSize: 12, bold: true },
                    statisticsText: { fontSize: 11 }
                },
                defaultStyle: { font: "Montserrat" }
            };

            pdfMake.createPdf(docDefinition).getBuffer(resolve);
        } catch (error) {
            reject(error);
        }
    });
}
