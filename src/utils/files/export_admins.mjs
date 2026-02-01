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

function getHeaderAndLogos({ carrera = 'No especificada', date = 'N/A' } = {}) {
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
        {
            text: 'INSTITUTO TECNOLÓGICO DE CUAUTLA',
            style: 'mainHeader',
        },
        {
            text:
                'SISTEMA WEB DE MONITOREO EDUCATIVO ENFOCADO A ÍNDICES DE REPROBACIÓN Y DESERCIÓN ESCOLAR',
            style: 'header',
        },
        {
            stack : [
                {
                    text: [
                        'Información de todos los administradores registrados en el sistema hasta ', {text: `${date}.`, decoration: 'underline'},
                    ]
                }
            ],
            style : 'text'
        },
        { text: '', margin: [0, 0, 0, 10] },
    ];
}

function getNewTable() {
    return {
        table: {
            headerRows: 1,
            widths: ['5%', '35%', '35%', '15%', '10%'],
            body: [
                [
                    { text: 'No', style: 'tableHeader' },
                    { text: 'Nombre', style: 'tableHeader' },
                    { text: 'Correo', style: 'tableHeader' },
                    { text: 'Fecha', style: 'tableHeader' },
                    { text: 'Hora', style: 'tableHeader' },
                ],
            ],
        },
        layout: {
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 3,
            paddingBottom: () => 3,
            fillColor: rowIndex => (rowIndex === 0 ? '#18316B' : null),
        },
    };
}

const pdfStyles = {
    mainHeader: {
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 10, 0, 10],
        font: 'Montserrat',
    },
    header: {
        fontSize: 12,
        bold: true,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
        font: 'Montserrat',
    },
    tableHeader: {
        fontSize: 11,
        bold: true,
        color: '#FFFFFF',
        alignment: 'center',
    },
    tableData: {
        fontSize: 10,
        alignment: 'center',
        font: 'Montserrat',
    },
    text: {
        fontSize: 12,
        alignment: 'left',
        margin: [0, 0, 0, 10],
        font: 'Montserrat',
    },
};

// generar el pdf y enviarlo en el buffer
export async function exportAdmins(data){
    return new Promise(async (resolve, reject) => {
        const { fecha, hora } = await getDateAndTime();
        const date = fecha || "Not specified";

        let content = [
            ...getHeaderAndLogos({ date: date }),
            getNewTable()
        ];
        data.forEach((item, index) => {
            if (index % 15 === 0 && index !== 0) {
                content.push({ text: '', pageBreak: 'before' });
                content.push(...getHeaderAndLogos());  
                content.push(getNewTable());
            }
            content[content.length - 1].table.body.push([
                { text: `${index + 1}`, style: 'tableData' },
                { text: item.nombre, style: 'tableData' },
                { text: item.correo, style: 'tableData' },
                { text: item.fechaRegistro, style: 'tableData' },
                { text: item.horaRegistro, style: 'tableData' }
            ]);
        });
        const docDefinition = {
            content: content,
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { text: `${currentPage.toString()}`, alignment: 'right', margin: [0, 0, 40, 0] }
                    ]
                };
            },
            styles: pdfStyles,
            defaultStyle: { font: 'Montserrat' }
        };
    
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer) => {
            resolve(buffer);
        });
    });
}
