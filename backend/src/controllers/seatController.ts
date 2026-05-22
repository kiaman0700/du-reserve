import { Request, Response } from 'express';
import { supabase } from '../supabaseClient';

/**
 * Base64 이미지 데이터를 바이너리 Buffer로 변환하여 Supabase Storage에 업로드하는 헬퍼 함수
 */
async function uploadBase64Image(base64String: string, fileName: string): Promise<string> {
  try {
    // data:image/png;base64,... 헤더 제거
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const { data, error } = await supabase.storage
      .from('evidence-photos')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      throw error;
    }

    // 업로드된 파일의 Public URL 반환
    const { data: urlData } = supabase.storage
      .from('evidence-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('이미지 업로드 에러:', err);
    throw new Error('증거 사진 업로드 중 서버 에러가 발생했습니다: ' + err.message);
  }
}

/**
 * 1. 전체 좌석 및 부재 신고 현황 조회 (실시간 상태 반영)
 * GET /api/seats
 */
export const getSeats = async (req: Request, res: Response) => {
  try {
    // 1.1. 전체 좌석 조회
    const { data: seatsData, error: seatsError } = await supabase
      .from('seats')
      .select('*')
      .order('seat_number', { ascending: true });

    if (seatsError) throw seatsError;

    // 1.2. 활성화된 예약 내역 및 이용자 프로필 조회
    const { data: reservationsData, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        seat_id,
        user_id,
        status,
        profiles (
          university_id,
          name
        )
      `)
      .eq('status', 'ACTIVE');

    if (resError) throw resError;

    // 1.3. 진행 중인(PENDING) 부재 신고 목록 조회
    const { data: reportsData, error: reportsError } = await supabase
      .from('absence_reports')
      .select('*')
      .eq('status', 'PENDING');

    if (reportsError) throw reportsError;

    // 1.4. 프론트엔드가 요구하는 데이터 포맷으로 24석 통합 매핑
    const mappedSeats = seatsData.map((seat: any) => {
      // 해당 좌석의 활성 예약 찾기
      const activeRes = reservationsData?.find((r: any) => r.seat_id === seat.id);
      // 해당 좌석의 대기 중인 부재 신고 찾기
      const activeReport = reportsData?.find((rep: any) => rep.seat_id === seat.id);

      // 경과 타이머 및 세부 정보 매핑
      let clearingTimerSeconds = undefined;
      if (seat.status === 'CLEARING') {
        const updatedAt = new Date(seat.updated_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - updatedAt) / 1000);
        // 물품 정리 타이머는 총 10분 = 600초
        clearingTimerSeconds = Math.max(0, 600 - elapsed);
      }

      let occupantName = undefined;
      if (activeRes && activeRes.profiles) {
        const profile: any = Array.isArray(activeRes.profiles) ? activeRes.profiles[0] : activeRes.profiles;
        if (profile) {
          occupantName = `${profile.name} (${profile.university_id})`;
        }
      }

      return {
        id: seat.id,
        seat_number: seat.seat_number,
        room_name: seat.room_name,
        status: seat.status,
        current_user_id: activeRes ? activeRes.user_id : undefined,
        current_user_name: occupantName,
        current_reservation_id: activeRes ? activeRes.id : undefined,
        clearing_timer_seconds: clearingTimerSeconds
      };
    });

    const mappedReports = reportsData?.map((report: any) => {
      const firstReportedAt = new Date(report.first_reported_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - firstReportedAt) / 1000);
      // 1차 경고 후 30분 경보 대기 = 1800초
      const warningTimerSeconds = Math.max(0, 1800 - elapsed);

      return {
        id: report.id,
        seat_id: report.seat_id,
        reporter_id: report.reporter_id,
        first_photo_url: report.first_photo_url,
        first_reported_at: report.first_reported_at,
        second_photo_url: report.second_photo_url || undefined,
        second_reported_at: report.second_reported_at || undefined,
        warning_timer_seconds: warningTimerSeconds,
        status: report.status
      };
    }) || [];

    return res.status(200).json({
      seats: mappedSeats,
      absenceReports: mappedReports
    });
  } catch (err: any) {
    console.error('좌석 조회 에러:', err);
    return res.status(500).json({
      error: '조회 실패',
      message: '좌석 상태 정보를 조회하는 중 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 2. 좌석 예약 신청
 * POST /api/reservations
 */
export const reserveSeat = async (req: Request, res: Response) => {
  const { seatId, userId } = req.body;

  if (!seatId || !userId) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId와 userId는 필수 파라미터입니다.'
    });
  }

  try {
    // Supabase RPC reserve_seat 함수 실행
    const { data: resId, error } = await supabase.rpc('reserve_seat', {
      p_seat_id: seatId,
      p_user_id: userId
    });

    if (error) {
      return res.status(400).json({
        error: '예약 실패',
        message: error.message
      });
    }

    return res.status(201).json({
      message: '좌석 예약이 완료되었습니다.',
      reservationId: resId
    });
  } catch (err: any) {
    console.error('예약 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '예약 신청을 처리하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 3. 자진 반납 및 퇴실
 * POST /api/reservations/checkout
 */
export const returnSeat = async (req: Request, res: Response) => {
  const { seatId, userId } = req.body;

  if (!seatId || !userId) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId와 userId는 필수 파라미터입니다.'
    });
  }

  try {
    // Supabase RPC return_seat 함수 실행
    const { error } = await supabase.rpc('return_seat', {
      p_seat_id: seatId,
      p_user_id: userId
    });

    if (error) {
      return res.status(400).json({
        error: '반납 실패',
        message: error.message
      });
    }

    return res.status(200).json({
      message: '좌석 자진 반납 및 퇴실 처리가 완료되었습니다.'
    });
  } catch (err: any) {
    console.error('반납 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '반납 신청을 처리하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 4. 1차 부재 신고 등록 (Base64 업로드 포함)
 * POST /api/absence-reports/1st
 */
export const submitAbsenceReport1st = async (req: Request, res: Response) => {
  const { seatId, reporterId, firstPhotoBase64 } = req.body;

  if (!seatId || !reporterId || !firstPhotoBase64) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId, reporterId, firstPhotoBase64는 필수 항목입니다.'
    });
  }

  try {
    // 4.1. Base64 이미지를 Supabase Storage에 업로드
    const fileName = `report_1st_${seatId}_${Date.now()}.png`;
    const photoUrl = await uploadBase64Image(firstPhotoBase64, fileName);

    // 4.2. Supabase RPC submit_absence_report_1st 호출
    const { data: reportId, error } = await supabase.rpc('submit_absence_report_1st', {
      p_seat_id: seatId,
      p_reporter_id: reporterId,
      p_photo_url: photoUrl
    });

    if (error) {
      return res.status(400).json({
        error: '신고 실패',
        message: error.message
      });
    }

    return res.status(201).json({
      message: '1차 부재 신고 및 경고 타이머 발송이 완료되었습니다.',
      reportId: reportId,
      photoUrl: photoUrl
    });
  } catch (err: any) {
    console.error('1차 신고 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '1차 부재 신고를 등록하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 5. 원래 예약자 복귀 처리
 * POST /api/absence-reports/return
 */
export const confirmUserReturned = async (req: Request, res: Response) => {
  const { seatId, userId } = req.body;

  if (!seatId || !userId) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId와 userId는 필수 파라미터입니다.'
    });
  }

  try {
    // Supabase RPC confirm_user_returned 호출
    const { error } = await supabase.rpc('confirm_user_returned', {
      p_seat_id: seatId,
      p_user_id: userId
    });

    if (error) {
      return res.status(400).json({
        error: '복귀 실패',
        message: error.message
      });
    }

    return res.status(200).json({
      message: '좌석 복귀 확인이 완료되어 정상 이용 상태로 복구되었습니다.'
    });
  } catch (err: any) {
    console.error('복귀 확인 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '복귀 처리를 진행하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 6. 2차 최종 부재 신고 등록 (30분 타이머 만료 후)
 * POST /api/absence-reports/2nd
 */
export const submitAbsenceReport2nd = async (req: Request, res: Response) => {
  const { seatId, secondPhotoBase64 } = req.body;

  if (!seatId || !secondPhotoBase64) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId와 secondPhotoBase64는 필수 항목입니다.'
    });
  }

  try {
    // 6.1. Base64 이미지를 Supabase Storage에 업로드
    const fileName = `report_2nd_${seatId}_${Date.now()}.png`;
    const photoUrl = await uploadBase64Image(secondPhotoBase64, fileName);

    // 6.2. Supabase RPC submit_absence_report_2nd 호출
    const { error } = await supabase.rpc('submit_absence_report_2nd', {
      p_seat_id: seatId,
      p_photo_url: photoUrl
    });

    if (error) {
      return res.status(400).json({
        error: '2차 최종 신고 실패',
        message: error.message
      });
    }

    return res.status(200).json({
      message: '2차 최종 신고가 정상 접수되었습니다. 사서의 물품 강제 정리 대기 상태로 변경됩니다.',
      photoUrl: photoUrl
    });
  } catch (err: any) {
    console.error('2차 신고 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '2차 부재 신고를 등록하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 7. 관리자/사서에 의한 좌석 강제 퇴실 처리 (CLEARING 물품정리중)
 * POST /api/absence-reports/release
 */
export const releaseSeatForce = async (req: Request, res: Response) => {
  const { seatId } = req.body;

  if (!seatId) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId는 필수 파라미터입니다.'
    });
  }

  try {
    // 7.1. 현재 좌석 정보 조회
    const { data: seat, error: seatError } = await supabase
      .from('seats')
      .select('*')
      .eq('id', seatId)
      .single();

    if (seatError || !seat) {
      return res.status(404).json({
        error: '좌석 없음',
        message: '해당 ID의 좌석을 찾을 수 없습니다.'
      });
    }

    const currentResId = seat.current_reservation_id;

    // 7.2. 좌석 상태를 CLEARING으로 변경 (트리거에 의해 활성 예약은 강제 종료(FORCED_RELEASED)됨)
    const { error: updateSeatError } = await supabase
      .from('seats')
      .update({
        status: 'CLEARING',
        updated_at: new Date().toISOString()
      })
      .eq('id', seatId);

    if (updateSeatError) throw updateSeatError;

    // 7.3. 관련 PENDING 부재 신고가 있다면 RESOLVED_RELEASED 처리
    if (currentResId) {
      await supabase
        .from('absence_reports')
        .update({
          status: 'RESOLVED_RELEASED',
          release_type: 'IMMEDIATE',
          resolved_at: new Date().toISOString()
        })
        .eq('reservation_id', currentResId)
        .eq('status', 'PENDING');
    }

    return res.status(200).json({
      message: '사서에 의한 좌석 강제 개방 및 물품 수거 상태(CLEARING)로 전환되었습니다.'
    });
  } catch (err: any) {
    console.error('강제 개방 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '강제 퇴실 및 개방을 처리하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};

/**
 * 8. 사서 보관 완료 처리 및 좌석 개방 완료 (AVAILABLE)
 * POST /api/absence-reports/clear-complete
 */
export const clearComplete = async (req: Request, res: Response) => {
  const { seatId } = req.body;

  if (!seatId) {
    return res.status(400).json({
      error: '잘못된 요청',
      message: 'seatId는 필수 파라미터입니다.'
    });
  }

  try {
    // 8.1. 좌석을 AVAILABLE로 변경하여 완전 빈자리 상태로 초기화
    const { error } = await supabase
      .from('seats')
      .update({
        status: 'AVAILABLE',
        current_reservation_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', seatId);

    if (error) {
      return res.status(400).json({
        error: '개방 실패',
        message: error.message
      });
    }

    return res.status(200).json({
      message: '물품 보관소 이송이 완료되어 좌석이 완전히 빈자리로 개방되었습니다.'
    });
  } catch (err: any) {
    console.error('정리 완료 에러:', err);
    return res.status(500).json({
      error: '서버 에러',
      message: '좌석 개방 완료를 처리하는 도중 서버 오류가 발생했습니다: ' + err.message
    });
  }
};
