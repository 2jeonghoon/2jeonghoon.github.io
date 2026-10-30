---
title: "종료 플래그만으로 블로킹 recv가 끝나지 않는 이유"
description: "수신 타임아웃, 종료 알림 FD와 shutdown을 이용한 종료 절차를 비교한다."
date: "2026-10-30"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "Linux", "recv", "스레드 종료"]
draft: false
aiGenerated: true
---

## 오늘의 질문

작업 스레드가 블로킹 소켓의 recv() 안에서 기다립니다. 관리 스레드가 std::atomic<bool> stopping을 true로 바꿨지만 join()이 끝나지 않습니다. 왜 그럴까요? 정상 종료를 위한 깨우기·취소 방법과 자원 정리 순서를 제안해 주세요.

## 핵심 해설

atomic은 플래그의 안전한 접근을 제공하지만 커널 안의 recv 대기를 자동으로 깨우지 않는다. join도 종료 명령이 아니라 완료를 기다리는 호출이다.

수신 타임아웃을 설정하거나 poll의 제한된 대기 시간을 사용해 종료 상태를 주기적으로 확인할 수 있다. 짧은 주기는 깨움 비용이 늘고 긴 주기는 종료 반응이 느려진다. 수신 타임아웃은 Linux에서 EAGAIN/EWOULDBLOCK을 반환할 수 있어 재확인과 정상 재시도, 영구 오류를 구분한다. 진행 중 작업까지 종료 시간 상한을 보장하는 것은 별도다.

이벤트 루프라면 논블로킹 소켓과 종료 알림 eventfd 또는 pipe를 함께 poll/epoll로 감시하는 방법이 명확하다. 관리 스레드가 종료 상태를 설정하고 알림 FD에 기록하면 작업 스레드는 깨어나 새 접수를 막고 자원을 정리한다. 알림 FD 추가만으로 기존의 직접 블로킹 recv가 깨어나는 것은 아니므로 수신 구조도 바꿔야 한다.

연결된 TCP 소켓을 중단해도 되는 정책이라면 관리 스레드에서 shutdown(fd, SHUT_RDWR)로 통신을 중단하고 수신 스레드가 반환값과 종료 상태를 확인해 빠져나오도록 설계할 수 있다. 소켓의 수명을 종료 요청 중에도 유지하고 오류도 처리한다. shutdown은 FD 자체를 해제하지 않는다. 작업자 종료 후 소유자가 close하는 식으로 최종 정리 책임을 한 곳에 둔다. 단순 강제 중단은 미처리·미송신 데이터의 정상 배출과 다르다.

다른 스레드에서 close하면 무조건 recv가 풀린다고 가정하지 않는다. Linux에서는 진행 중 I/O가 열린 파일 기술을 참조해 계속될 수 있으며 FD 번호 재사용 경쟁도 있다.

## 면접용 모범 답변

종료 플래그를 바꿔도 recv 안에서 대기하는 스레드는 이를 검사할 수 없습니다. 주기적 수신 타임아웃으로 확인하거나, 논블로킹 소켓과 종료 알림 FD를 함께 기다리는 구조를 사용하겠습니다. 연결 중단이 허용되면 shutdown으로 수신 대기를 해제하는 방법도 검토하고 작업자가 빠져나온 뒤 join과 최종 close를 수행하겠습니다. 종료 플래그, 깨우기와 자원 수명 관리는 별도로 설계하겠습니다.

## 참고 자료

- [Linux recv(2)](https://man7.org/linux/man-pages/man2/recv.2.html)
- [Linux shutdown(2)](https://man7.org/linux/man-pages/man2/shutdown.2.html)
- [Linux close(2): 다른 스레드의 I/O 중 close 주의사항](https://man7.org/linux/man-pages/man2/close.2.html)
