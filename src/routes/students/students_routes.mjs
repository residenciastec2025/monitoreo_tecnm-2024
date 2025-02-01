import * as controllers from '../../controllers/students/students_controllers.mjs';
import teacherToken from '../../middlewares/teacher_token.mjs';

import express from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

const secret = process.env.SECRET;
const upload = multer();
const router = express.Router();

router.use(cookieParser(secret));
router.post('/upload-list-students', upload.single('file'), teacherToken(), controllers.uploadStudentsFromCSV);
router.put('/update-evaluations-students', teacherToken(), controllers.updateRatings);
router.get('/generate-statistics/:id', teacherToken(), controllers.generateStatistics);
router.get('/export-student-list/:id/:unit', teacherToken(), controllers.exportUnitStudentList);
router.get('/export-final-student-list/:id', teacherToken(), controllers.exportFinalStudentList);

export default router;