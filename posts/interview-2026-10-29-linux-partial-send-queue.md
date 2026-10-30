---
title: "논블로킹 TCP 부분 송신과 송신 큐의 순서 보장"
description: "send 반환값, EAGAIN, EPOLLOUT과 메시지별 송신 오프셋을 정리한다."
date: "2026-10-29"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "Linux", "TCP"]
draft: false
aiGenerated: true
---

## 오늘의 질문

논블로킹 소켓으로 64KB 메시지를 보내려는데 send()가 8KB를 반환했습니다. 이후 호출은 EAGAIN을 반환합니다. 남은 데이터를 어떻게 관리하고 언제 다시 전송하겠습니까? 같은 연결의 다음 메시지와 순서가 섞이지 않게 하는 방법도 설명해 주세요.

## 핵심 해설

send가 8KiB를 반환하면 앞의 8KiB가 커널에 받아들여졌다는 뜻이지 상대 애플리케이션이 처리했다는 뜻은 아니다. 논블로킹 EAGAIN은 현재 추가 송신을 진행할 수 없다는 뜻이다. 느린 수신자로 송신 버퍼 여유가 줄어드는 상황이 대표적이지만 반환값만으로 원인을 전부 단정하지는 않는다.

연결별 송신 큐에 메시지 데이터와 현재 오프셋을 보관한다. send(buffer + offset, size - offset)를 호출하고 양수 반환만큼 offset을 증가시킨다. EAGAIN이면 반복 재시도하지 않고 EPOLLOUT 같은 쓰기 가능 알림을 기다린다. 알림 후에도 반환값과 오류를 확인한다.

~~~text
큐: A(64KiB), B
첫 send: A 앞 8KiB 수락 → A offset=8KiB
다음 send: EAGAIN → 쓰기 가능 알림 대기
재시도: A의 남은 부분부터 계속
A 완료 후에만 B 송신 시작
~~~

A 앞부분, B, A 뒷부분 순으로 send하면 TCP는 그 바이트 순서를 유지한다. 따라서 TCP의 순서 보장만으로 애플리케이션 메시지의 잘못된 끼어들기를 고칠 수 없다. 연결별 단일 송신 담당자나 큐와 직렬화로 메시지 순서를 보장한다.

EINTR은 재시도하고 연결 오류는 정리한다. 0 반환을 무한 반복하지 않고 무진행 상태로 처리한다. Linux에서 MSG_NOSIGNAL 등으로 SIGPIPE 정책을 정한다. pending 데이터가 있을 때 쓰기 감시를 활성화하고 모두 비우면 해제한다. ET에서는 새로 큐에 넣을 때 즉시 송신을 시도하고 EAGAIN에서 알림 대기로 전환한다. 송신 큐 상한과 느린 연결의 타임아웃도 필요하다.

## 면접용 모범 답변

부분 송신이므로 반환된 8KiB만큼 오프셋을 이동하고 남은 56KiB를 큐에 유지하겠습니다. EAGAIN에서는 쓰기 가능 이벤트를 기다린 뒤 같은 메시지의 남은 부분부터 재시도합니다. 메시지 하나를 모두 송신한 뒤 다음 메시지를 처리하도록 연결별 송신을 직렬화하겠습니다. TCP의 바이트 순서 보장과 애플리케이션의 메시지 순서 관리는 구분하겠습니다.

## 참고 자료

- [Linux send(2)](https://man7.org/linux/man-pages/man2/send.2.html)
- [Linux epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
