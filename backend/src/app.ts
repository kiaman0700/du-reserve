import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

// Middleware 설정
app.use(cors()); // 프론트엔드 크로스 오리진 요청 허용
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

// 기본 상태 확인 라우트
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to Du-Reserve API Server!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API 경로 예시 (추후 라우터를 이와 같이 연결하면 됩니다)
// app.use('/api/users', userRouter);
// app.use('/api/reservations', reservationRouter);

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
