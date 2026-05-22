import express, { Request, Response } from 'express';
import cors from 'cors';
import * as seatController from './controllers/seatController';

const app = express();

// Middleware 설정
app.use(cors()); // 프론트엔드 크로스 오리진 요청 허용
app.use(express.json({ limit: '50mb' })); // Base64 이미지 업로드를 위해 JSON 파싱 제한 확장
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 기본 상태 확인 라우트
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to Du-Reserve API Server!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 스마트 열람실 API 라우터 맵핑
app.get('/api/seats', seatController.getSeats);
app.post('/api/reservations', seatController.reserveSeat);
app.post('/api/reservations/checkout', seatController.returnSeat);
app.post('/api/absence-reports/1st', seatController.submitAbsenceReport1st);
app.post('/api/absence-reports/return', seatController.confirmUserReturned);
app.post('/api/absence-reports/2nd', seatController.submitAbsenceReport2nd);
app.post('/api/absence-reports/release', seatController.releaseSeatForce);
app.post('/api/absence-reports/clear-complete', seatController.clearComplete);

// 404 에러 처리 핸들러
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: '요청하신 API 경로를 찾을 수 없습니다.'
  });
});

// 전역 에러 처리 핸들러
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: '서버 내부 에러가 발생했습니다.'
  });
});

export default app;
