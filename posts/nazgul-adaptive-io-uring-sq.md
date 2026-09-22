---
title: "Nazgul: io_uring의 Submission Queue를 동적으로 관리하기"
description: "고정된 SQ depth가 만드는 병렬성과 캐시 효율의 딜레마를 풀기 위해, 부하에 따라 capacity를 확장하고 회수하는 커널 메커니즘을 설계한 기록입니다."
date: "2026-09-21"
category: Systems
tags: [Linux, io_uring, Kernel, Performance]
readingTime: 8 min read
image: assets/nazgul-architecture.png
featured: true
draft: false
aiGenerated: true
---

`io_uring`은 애플리케이션과 Linux 커널이 공유 메모리의 queue를 통해 I/O 요청과 완료를 교환하는 비동기 I/O 인터페이스다. 특히 SQPOLL 모드에서는 커널 스레드가 Submission Queue를 polling하므로 애플리케이션의 submission과 커널의 issuance가 병렬로 진행된다.

## 고정된 queue depth의 딜레마

Submission Queue의 크기는 생성 시점에 정해진다. 작은 queue는 cache locality에 유리하지만 순간적인 burst를 받아내지 못해 submission stall을 만든다. 반대로 큰 queue는 burst를 흡수하지만 평상시에도 더 큰 메모리 영역을 순회하며 cache pressure를 높인다.

> 워크로드는 변하는데 queue의 크기만 고정되어 있다는 것이 문제의 출발점이었다.

## Nazgul의 접근

Nazgul은 기존 `io_uring` 인터페이스를 변경하지 않고 SQPOLL의 유효 submission capacity를 동적으로 관리한다. SQ가 포화되면 block 단위로 capacity를 확장하고, 부하가 낮아지면 사용되지 않는 block을 회수한다.

![Nazgul의 동적 Submission Queue 관리 구조](assets/nazgul-architecture.png)

### 설계 원칙

- **User-transparent:** 기존 애플리케이션을 수정하지 않는다.
- **Burst responsive:** queue 포화를 감지해 빠르게 여유 공간을 확보한다.
- **Cache conscious:** 부하가 사라진 뒤에는 확장한 block을 회수한다.

## 투명한 remapping

애플리케이션이 보고 있는 submission path를 유지하면서 내부 block의 연결을 바꾸는 것이 핵심이다. 이 방식으로 API 호환성을 지키고 동적 capacity가 애플리케이션의 복잡도로 새어 나오지 않게 했다.

## 배운 점

성능 최적화는 가장 큰 숫자를 선택하는 일이 아니었다. 작은 queue와 큰 queue가 각각 잘하는 구간을 인정하고, 시스템이 현재 부하에 맞는 상태로 이동하게 만드는 일이 더 중요했다. Nazgul은 그 관찰을 Linux I/O 경로에 적용한 결과다.
