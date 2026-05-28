import app from './app';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient';

// .env 파일의 환경 변수 로드
dotenv.config();

const PORT = process.env.PORT || 5000;

// 데모 계정 자동 생성 및 이메일 확인(Confirm) 우회 처리 함수
async function initializeDemoAccounts() {
  console.log('🔄 데모 계정 자동 생성 및 인증 처리 프로세스 시작...');
  try {
    // 1. 학생 데모 계정 (강민성) 생성 및 확인 처리
    const studentEmail = '20222043@daegu.ac.kr';
    const studentPassword = '20222043__daegu!';
    
    const { data: studentUser, error: studentError } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        university_id: '20222043',
        name: '강민성 (컴퓨터공학과)',
        role: 'USER'
      }
    });

    if (studentError) {
      if (studentError.message.includes('already exists') || studentError.message.includes('already registered')) {
        console.log('💡 학생 데모 계정이 이미 가입되어 있습니다.');
      } else {
        console.warn('⚠️ 학생 데모 계정 생성 에러:', studentError.message);
      }
    } else {
      console.log('✅ 학생 데모 계정 생성 및 이메일 자동 인증 성공!');
    }

    // 2. 관리자 데모 계정 (이영희 사서관) 생성 및 확인 처리
    const adminEmail = 'ADM-9942@daegu.ac.kr';
    const adminPassword = 'admin_daegu_2026!';
    
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        university_id: 'ADM-9942',
        name: '이영희 사서관',
        role: 'ADMIN'
      }
    });

    if (adminError) {
      if (adminError.message.includes('already exists') || adminError.message.includes('already registered')) {
        console.log('💡 관리자 데모 계정이 이미 가입되어 있습니다.');
      } else {
        console.warn('⚠️ 관리자 데모 계정 생성 에러:', adminError.message);
      }
    } else {
      console.log('✅ 관리자 데모 계정 생성 및 이메일 자동 인증 성공!');
    }

    // 3. profiles 테이블 동기화 보장 및 기존 계정 비밀번호/이메일 인증 리셋
    const { data: testStudent } = await supabase.from('profiles').select('id').eq('university_id', '20222043').maybeSingle();
    if (testStudent) {
      // 기존 계정 강제 패스워드 리셋 및 인증 강제
      const { error: resetErr } = await supabase.auth.admin.updateUserById(testStudent.id, {
        password: '20222043__daegu!',
        email_confirm: true
      });
      if (resetErr) console.warn('⚠️ 학생 데모 계정 패스워드 리셋 실패:', resetErr.message);
      else console.log('🔄 학생 데모 계정 패스워드 무결성 확인 및 초기화 완료');
    } else if (studentUser?.user) {
      await supabase.from('profiles').insert({
        id: studentUser.user.id,
        university_id: '20222043',
        name: '강민성 (컴퓨터공학과)',
        role: 'USER'
      });
      console.log('✅ 학생 프로필 테이블 강제 연동 완료');
    }

    const { data: testAdmin } = await supabase.from('profiles').select('id').eq('university_id', 'ADM-9942').maybeSingle();
    if (testAdmin) {
      const { error: resetErr } = await supabase.auth.admin.updateUserById(testAdmin.id, {
        password: 'admin_daegu_2026!',
        email_confirm: true
      });
      if (resetErr) console.warn('⚠️ 관리자 데모 계정 패스워드 리셋 실패:', resetErr.message);
      else console.log('🔄 관리자 데모 계정 패스워드 무결성 확인 및 초기화 완료');
    } else if (adminUser?.user) {
      await supabase.from('profiles').insert({
        id: adminUser.user.id,
        university_id: 'ADM-9942',
        name: '이영희 사서관',
        role: 'ADMIN',
        managed_college_id: 'library'
      });
      console.log('✅ 관리자 프로필 테이블 강제 연동 완료');
    }

    console.log('✨ 데모 계정 검증 및 동기화 무결성 확보 완료.');
  } catch (err: any) {
    console.error('⚠️ 데모 초기화 중 예외 오류 발생:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`========================================`);
  console.log(`  🚀 Du-Reserve Backend API Server      `);
  console.log(`  🌐 Server is running on port: ${PORT} `);
  console.log(`  📅 Started at: ${new Date().toLocaleString()} `);
  console.log(`========================================`);
  
  // 서버 실행 즉시 데모 계정 상태 초기화 및 자동 동기화 처리
  await initializeDemoAccounts();
});
