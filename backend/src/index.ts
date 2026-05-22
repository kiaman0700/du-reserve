import app from './app';
import dotenv from 'dotenv';

// .env 파일의 환경 변수 로드
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  🚀 Du-Reserve Backend API Server      `);
  console.log(`  🌐 Server is running on port: ${PORT} `);
  console.log(`  📅 Started at: ${new Date().toLocaleString()} `);
  console.log(`========================================`);
});
