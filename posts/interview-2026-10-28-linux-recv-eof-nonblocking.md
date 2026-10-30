---
title: "recv 반환값과 블로킹·논블로킹 소켓의 차이"
description: "연결 종료와 오류, EAGAIN을 구분하고 CPU 무한 반복을 방지하는 수신 처리를 정리한다."
date: "2026-10-28"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "Linux", "recv", "소켓"]
draft: false
aiGenerated: true
---

## 오늘의 질문

다음 코드를 실행하는 서버가 클라이언트 연결 종료 후 CPU 코어 하나를 계속 사용합니다.

~~~cpp
while (running) {
    int n = recv(fd, buffer, sizeof(buffer), 0);
    if (n > 0) {
        handle(buffer, n);
    }
}
~~~

반환값별로 어떤 처리가 빠졌습니까? 블로킹 소켓과 논블로킹 소켓에서 각각 어떻게 수정하겠습니까?

## 핵심 해설

TCP 소켓에서 양수 크기로 recv를 요청했을 때 정상적인 상대 송신 종료는 음수가 아니라 0이다. FIN 이전의 남은 데이터를 모두 읽고 나면 recv가 0을 반환한다. 로컬 소켓 전체가 자동으로 닫혔다는 뜻은 아니며, 반대 방향 송신은 프로토콜 정책에 따라 유지할 수 있다.

0을 무시하고 반복하면 이후 호출도 즉시 0을 반환하여 CPU를 낭비할 수 있다. 논블로킹의 EAGAIN을 즉시 재시도하는 무한 반복도 같은 문제를 만든다.

| 결과 | 의미 | 처리 |
| --- | --- | --- |
| n > 0 | n바이트 수신 | 누적 버퍼에 추가하고 메시지 조립 |
| n == 0 | 상대 송신 방향의 정상 종료 | 읽기 감시 해제, 종료 정책 수행 |
| n == -1, EINTR | 시그널로 중단 | 재시도하되 취소 정책도 고려 |
| n == -1, EAGAIN/EWOULDBLOCK | 지금은 읽을 데이터가 없음 | 이벤트를 기다림 |
| 그 외 오류 | 연결 재설정 등 | 기록 후 원인에 따른 정리 |

기본 블로킹 소켓은 데이터도 종료도 오류도 없으면 recv 안에서 기다린다. 논블로킹 소켓은 같은 상황에서 -1과 EAGAIN/EWOULDBLOCK으로 즉시 반환한다. 블로킹도 EOF에서는 0을 반환한다. 수신 타임아웃을 설정한 블로킹 소켓에서는 타임아웃도 EAGAIN/EWOULDBLOCK으로 보고될 수 있다.

## 논블로킹 수신 이벤트 처리 예시

아래는 O_NONBLOCK이 설정된 TCP 소켓에서 수신 이벤트마다 호출하는 함수의 흐름이다. 각 보조 함수는 서버가 구현해야 한다. 종료와 오류의 정리 함수는 epoll 등록과 연결 객체의 수명을 서버 정책에 맞게 관리해야 한다.

~~~cpp
void on_readable(int fd)
{
    char buffer[4096];

    while (true) {
        ssize_t n = recv(fd, buffer, sizeof(buffer), 0);

        if (n > 0) {
            append_and_parse(fd, buffer, static_cast<size_t>(n));
            // 이 예시는 보조 함수가 fd를 닫지 않는다고 가정
            continue;
        }

        if (n == 0) {
            handle_peer_eof(fd);
            return;
        }

        const int error = errno;
        if (error == EINTR) {
            continue;
        }

        if (error == EAGAIN || error == EWOULDBLOCK) {
            return; // 바깥 이벤트 루프의 epoll_wait로 복귀
        }

        handle_socket_error(fd, error);
        return;
    }
}
~~~

EAGAIN은 연결 종료가 아니다. 이벤트 대기로 돌아가야 하며, 위 함수를 쉬지 않고 다시 호출하면 바쁜 대기가 된다. 실제 서버에서는 파싱 실패, 자원 상한, 실행 중 연결 종료와 스레드 간 FD 소유권도 다뤄야 한다.

## 면접용 모범 답변

양수 수신만 처리하고 EOF와 오류를 무시한 것이 문제입니다. TCP에서 recv가 0이면 상대 송신 종료이므로 읽기 반복을 끝내고 종료 정책을 수행하겠습니다. 음수면 errno를 확인해 EINTR은 재시도하고, 논블로킹의 EAGAIN은 이벤트 대기로 돌아가겠습니다. 블로킹은 데이터가 없을 때 호출 안에서 기다리고, 논블로킹은 즉시 반환한다는 차이가 있습니다.

## 참고 자료

- [Linux recv(2)](https://man7.org/linux/man-pages/man2/recv.2.html)
- [Linux epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
