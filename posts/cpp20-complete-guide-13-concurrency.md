---
title: "13: 동시성 도구의 확장"
description: "latch, barrier, semaphore, 원자적 대기와 동기화 출력의 역할과 한계를 비교합니다."
date: "2026-10-19"
order: 13
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Concurrency", "Atomic", "Synchronization"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 13.1 latch와 barrier로 단계 맞추기

뮤텍스는 한 번에 누가 접근하는지 정하지만, 단계 동기화는 언제 다음 단계로 진행할지를 정한다.
`latch`는 카운터가 0이 되는 단 한 번의 사건을 기다리는 도구다.
`barrier`는 여러 단계에서 같은 집단이 반복해서 만나는 상황에 적합하다.

```cpp
#include <array>
#include <cassert>
#include <latch>
#include <thread>

int main() {
    std::array<int, 2> result{};
    std::latch done(2);
    std::jthread left([&] { result[0] = 10; done.count_down(); });
    std::jthread right([&] { result[1] = 20; done.count_down(); });
    done.wait();
    assert(result[0] + result[1] == 30);
}
```

각 작업은 서로 다른 배열 원소를 기록한다.
완료 통지가 읽기보다 앞선다는 동기화가 있으므로, 단순히 시간이 충분히 흘렀다고 추측할 필요가 없다.
`latch`의 카운터를 다시 채워 다음 라운드에 재사용하지 않는다.

### barrier의 반복 단계

`arrive_and_wait()`는 도착을 알리고 해당 단계가 끝날 때까지 기다린다.
`arrive_and_drop()`은 현재 단계에 도착하면서 이후 단계의 참가자 수에서도 빠진다.
완료 함수는 단계 사이에 한 번 수행할 집계 작업에 유용하며, 던지지 않는 함수로 설계한다.

참가자가 예외 때문에 도착하지 못하면 나머지 참가자가 영원히 기다릴 수 있다.
작업 실패를 결과로 기록한 뒤 합의된 경로로 도착시키는 등의 종료 정책이 필요하다.
단계 완료를 모든 작업의 최종 종료와 혼동하지 않는다.

## 13.2 semaphore는 사용 가능한 허가 수를 센다

`counting_semaphore`는 자원 슬롯이나 생산된 작업 수를 표현한다.
`binary_semaphore`는 최대 허가 수가 작은 경우의 특수한 형태다.
뮤텍스처럼 잠근 스레드가 해제해야 한다는 소유권 규칙으로 이해하면 용도를 놓친다.

```cpp
#include <semaphore>
#include <thread>
#include <cassert>

int main() {
    std::binary_semaphore available(0);
    int payload = 0;
    std::jthread producer([&] {
        payload = 73;
        available.release();
    });
    available.acquire();
    assert(payload == 73);
}
```

초깃값 0은 소비자가 생산 완료 전에는 통과하지 못한다는 뜻이다.
실제 큐에서는 허가를 얻어도 컨테이너 내부 변경을 보호하는 잠금이 따로 필요할 수 있다.
`try_acquire()`의 실패를 큐가 반드시 비었다는 영구적 사실로 해석하지 않는다.

## 13.3 원자적 타입의 확장

`atomic_ref<T>`는 기존 객체의 저장소에 원자적 접근을 적용한다.
요구 정렬을 충족해야 하며, 참조가 존재하는 동안 대상에 대한 접근은 관련 규칙을 지켜야 한다.
원자적 경로와 일반 읽기·쓰기를 동시에 섞는 우회로로 사용하지 않는다.

`atomic<shared_ptr<T>>`는 공유 포인터 값의 교체와 읽기를 동기화한다.
포인터가 가리키는 `T`의 멤버 변경까지 자동으로 보호하지는 않는다.
원자적 부동소수점 타입은 누적 등에 쓸 수 있지만, 실행 순서가 달라지면 반올림 결과도 달라질 수 있다.

### 값 변화 기다리기와 atomic_flag

```cpp
#include <atomic>
#include <thread>
#include <cassert>

int main() {
    std::atomic<int> phase{0};
    int answer = 0;
    std::jthread worker([&] {
        answer = 42;
        phase.store(1, std::memory_order_release);
        phase.notify_one();
    });
    phase.wait(0, std::memory_order_acquire);
    assert(answer == 42);
}
```

`notify_one()`만으로 값이 바뀌지는 않는다. 상태 저장과 통지를 각각 해야 한다.
대기 중 0→1→0으로 되돌아가는 짧은 변화를 놓칠 수 있으므로, 사건 횟수가 중요하면 세대 번호를 둔다.
`atomic_flag`에도 `test()`, `wait()`, 통지 기능이 추가되어 바쁜 반복 대기를 줄일 수 있다.

## 13.4 osyncstream으로 출력 묶기

`std::osyncstream`은 임시 버퍼에 모은 문자를 같은 목적 버퍼로 원자적으로 전달한다.
로그 한 줄 전체를 한 객체의 수명 안에서 작성하면 여러 스레드의 글자가 뒤섞이는 현상을 줄인다.
파일 스트림도 같은 방식으로 감쌀 수 있다.

코드 조각: `std::osyncstream{std::cout} << "job " << id << '\n';`
이 조각에는 `<syncstream>`, `<iostream>`, 정수 `id`가 필요하다.
일반 `cout` 직접 출력과 동기화 출력을 무질서하게 섞으면 전체 로그의 묶음 보장을 기대하기 어렵다.
출력의 무결성과 어떤 작업이 먼저 출력되는지는 별개의 문제다.

## 13.5 복습 질문

- 딱 한 번 완료를 기다리는가, 반복 단계에서 모이는가?
- semaphore 허가 수와 컨테이너의 원소 수는 언제 함께 갱신되는가?
- atomic 포인터와 pointee의 동기화 책임을 구분할 수 있는가?
- 값 저장 없이 notify만 하면 대기자가 왜 계속 기다릴 수 있는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: latch와 barrier](https://timsong-cpp.github.io/cppwp/n4861/thread.coord)
- [C++20 초안 N4861: semaphore](https://timsong-cpp.github.io/cppwp/n4861/thread.sema)
- [C++20 초안 N4861: atomic 대기](https://timsong-cpp.github.io/cppwp/n4861/atomics.wait)
- [C++20 초안 N4861: 동기화 출력](https://timsong-cpp.github.io/cppwp/n4861/syncstream)
