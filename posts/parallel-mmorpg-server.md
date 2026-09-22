---
title: MMORPG 서버의 병렬 처리 구조를 설계하며 배운 것
description: "많은 사용자의 상태 변경을 안정적으로 처리하기 위해 태스크 시스템과 lock-based, lock-free 동기화 방식을 비교하고 적용한 과정입니다."
date: "2024-08-31"
category: Game Server
tags: [C, Multithreading, Networking, MMORPG]
readingTime: 6 min read
image: assets/mmorpg-server-architecture.png
featured: false
draft: false
aiGenerated: true
---

MMORPG 서버는 수많은 사용자의 입력과 월드 상태 변경을 동시에 처리해야 한다. 처리량을 높이기 위해 스레드를 늘리는 것만으로는 충분하지 않았다. 공유 상태에 대한 경쟁이 커질수록 응답 시간은 오히려 불안정해졌다.

## 작업을 태스크로 분리하기

네트워크 이벤트를 받은 스레드가 게임 로직 전체를 수행하지 않도록 작업을 작은 태스크로 분리했다. 태스크는 실행에 필요한 상태와 연산을 캡슐화하고 worker가 처리한다. 덕분에 I/O 처리와 게임 상태 변경의 책임을 분리할 수 있었다.

![MMORPG 서버의 소켓, 동기화, 태스크 시스템 구조](assets/mmorpg-server-architecture.png)

## Lock은 없애는 것보다 범위를 아는 것이 먼저다

lock-free 자료구조가 언제나 더 빠른 것은 아니다. 충돌 빈도, 임계 영역의 크기, 재시도 비용을 함께 보아야 한다. 비교 과정에서는 다음 항목을 중심으로 측정했다.

- 동시 접속자 증가에 따른 평균·꼬리 응답 시간
- 공유 객체별 contention 빈도
- 재시도와 context switching에 소비되는 CPU 시간

## 결론

좋은 병렬 구조는 스레드의 수보다 소유권이 분명했다. 어느 worker가 어떤 상태를 바꿀 수 있는지 제한하고, 공유가 필요한 지점을 작게 유지하자 처리량뿐 아니라 디버깅 가능성도 좋아졌다.

관련 연구는 [A Study on Parallel Programming Approach for MMO Game Server](https://db.koreascholar.com/Article/Detail/427710)에서 확인할 수 있다.
