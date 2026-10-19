---
title: "07: 동시성 API"
description: "Item 35–40. 작업과 스레드, future의 대기, 이벤트 통지와 atomic의 역할을 공부합니다."
date: "2026-10-19"
order: 7
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++", "Effective Modern C++", "Concurrency", "future", "atomic"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 7장 Item 35–40 순서다. 공개 목차와 표준 라이브러리 참조를 바탕으로 작성한 독자적인 학습 노트이며 책 전체 본문의 번역은 아니다. 예제는 독립적인 C++11/14 함수·선언 조각이다.

## Item 35. 실행 스레드보다 반환할 작업을 먼저 설계하기

```cpp
#include <future>
int calculate(int input) { return input * input; }
int result() {
    auto pending = std::async(std::launch::async, calculate, 8);
    return pending.get();
}
```

future는 작업 결과와 예외를 회수할 통로다. 직접 thread를 만들면 결과 저장 위치, 예외 전달, join 책임을 따로 설계해야 한다. 결과가 있는 독립 작업이라면 작업 기반 API로 책임을 줄일 수 있다.

async가 애플리케이션 전체의 작업 스케줄러나 동시 실행 수 제한을 제공한다고 생각하면 안 된다. 많은 작은 작업을 반복 생성한다면 실행 자원과 오버헤드를 측정하고 별도 실행기 설계를 검토한다. get은 완료를 기다리며 작업이 저장한 예외를 다시 던질 수 있다.

## Item 36. 비동기 실행이 필요하면 정책 명시하기

기본 std::async는 async와 deferred 정책 중 하나를 선택할 수 있다. deferred이면 대기하는 호출 스레드에서 나중에 실행될 수 있으므로 백그라운드 진행을 기대하는 코드와 맞지 않을 수 있다.

```cpp
#include <chrono>
#include <future>
void observe() {
    auto pending = std::async([] { return 12; });
    auto state = pending.wait_for(std::chrono::milliseconds(0));
    if (state == std::future_status::deferred) {
        // 정책상 지연됨: 여기서는 get으로 실행·회수한다.
        (void)pending.get();
    } else {
        (void)pending.get();
    }
}
```

wait_for가 timeout인지만 확인하는 반복문은 deferred 상태에서 영원히 진행하지 못할 수 있다. 실행 정책을 통제하거나 deferred를 별도로 처리한다. launch::async를 지정해도 자원 확보 실패가 없어지는 것은 아니다. [async 정책과 공유 상태](https://eel.is/c++draft/futures.async)

## Item 37. 모든 경로에서 thread를 join 불가능 상태로 만들기

joinable thread의 소멸자는 terminate를 호출한다. 작업이 이미 끝났더라도 join이나 detach를 하지 않은 thread 객체는 joinable일 수 있다. 예외 경로를 포함해 종료 책임이 필요하다.

```cpp
#include <thread>
class JoinOnExit {
    std::thread& worker_;
public:
    explicit JoinOnExit(std::thread& worker) : worker_(worker) {}
    JoinOnExit(const JoinOnExit&) = delete;
    JoinOnExit& operator=(const JoinOnExit&) = delete;
    ~JoinOnExit() {
        if (worker_.joinable()) worker_.join();
    }
};
void run() {
    int output = 0;
    std::thread worker([&output] { output = 42; });
    JoinOnExit guard(worker);
    // guard가 먼저 파괴되고 join한 뒤 output이 파괴된다.
}
```

이 간단한 가드는 생성한 호출 스레드에서 스코프를 종료한다는 사용 조건이 있다. 자기 자신 join 같은 계약 위반과 join 실패를 처리하는 범용 구현은 아니다. join은 작업 완료까지 블로킹하므로 교착과 지연 가능성도 고려한다. detach는 참조 대상의 수명 문제를 해결하지 않는다. [thread 소멸자](https://eel.is/c++draft/thread.thread.destr)

## Item 38. future 소멸의 대기 여부는 공유 상태의 출처로 판단하기

promise나 packaged_task에서 얻은 future를 파괴하는 것과 launch::async 작업의 마지막 참조를 해제하는 것은 같지 않다. async가 만든 공유 상태에서는 조건에 따라 해제 시 작업 완료를 기다릴 수 있다.

```cpp
#include <future>
void hiddenWait() {
    auto pending = std::async(std::launch::async, [] {
        // 독립적인 계산
        return 1;
    });
} // get을 쓰지 않아도 이 지점에서 대기할 수 있다.
```

반환 future를 즉시 버리는 두 개의 async 문장은 기대와 달리 직렬 실행처럼 보일 수 있다. 공유 상태를 누가 유지하는지, 마지막 해제가 어디서 일어나는지 추적한다. shared_future도 복사본 가운데 마지막 참조가 중요하다.

소멸자는 작업의 예외를 get처럼 다시 던져 주지 않는다. 실패를 관찰해야 한다면 명시적으로 결과를 회수하는 경로가 필요하다. future를 파괴하면 일반적으로 작업이 취소된다고 가정하지 않는다. [공유 상태의 수명](https://eel.is/c++draft/futures.state) [future의 공유 상태 해제](https://eel.is/c++draft/futures.unique.future)

## Item 39. 한 번의 사건 통지는 promise와 future로 표현하기

```cpp
#include <future>
#include <thread>
void signalOnce() {
    std::promise<void> ready;
    auto event = ready.get_future();
    std::thread producer([&ready] { ready.set_value(); });
    try {
        event.get();
    } catch (...) {
        producer.join();
        throw;
    }
    producer.join();
}
```

void promise는 값 없이 준비 완료를 나타낼 수 있다. 통지가 대기보다 먼저 발생해도 공유 상태에 준비 상태가 남는다. condition_variable의 조건과 잠금 규약, 가짜 깨움 처리와 다른 비용 모델을 가진다.

promise는 일회성 통지다. 반복 이벤트 큐를 자동으로 구현하지 않는다. promise가 준비 상태를 만들지 못하고 파괴되면 대기자는 broken_promise 예외를 관찰할 수 있다. 여러 대기자가 필요하면 shared_future를 검토한다. 누가 실패를 set_exception으로 전달할지도 설계한다. [promise 명세](https://eel.is/c++draft/futures.promise)

## Item 40. atomic은 동기화, volatile은 다른 목적

```cpp
#include <atomic>
std::atomic<int> completed{0};
void countCompletion() {
    completed.fetch_add(1, std::memory_order_relaxed);
}
```

여기서는 독립적인 완료 횟수만 집계하므로 relaxed 원자 증가를 예로 들었다. 이 값이 증가했다는 사실로 다른 비원자 데이터가 공개되었다고 해석하면 안 된다. 메시지 전달에는 적절한 release/acquire 관계나 mutex가 필요하다.

atomic 변수에서도 `load()`한 뒤 계산하고 `store()`하는 여러 단계는 하나의 원자적 갱신이 아니다. 카운터에는 fetch_add 같은 read-modify-write 연산을 쓴다. 여러 변수의 불변식은 원자 변수 하나로 자동 보호되지 않는다.

volatile은 일반적인 스레드 동기화나 데이터 경쟁 해결 도구가 아니다. 메모리 매핑 장치 등의 접근은 플랫폼 규약까지 함께 읽어야 한다. atomic이 항상 lock-free라는 가정도 피한다. [원자 연산 명세](https://eel.is/c++draft/atomics)

## 복습과 이후 표준

- 작업의 결과와 예외를 어느 코드가 회수하는가?
- 실행 정책에 deferred가 포함되는가?
- 조기 반환과 예외에서도 thread가 정리되는가?
- future를 마지막으로 해제하는 위치가 블로킹해도 괜찮은가?
- 통지가 한 번인지 반복인지, 공개할 데이터가 있는지 구별한다.

C++20 jthread는 자동 join과 협력적 중단을 제공하는 이후 기능이다. 작업을 강제로 종료하는 도구는 아니며 이 장의 C++11/14 thread 계약과 분리해 공부한다. [저자의 책 범위 안내](https://www.aristeia.com/EMC%2B%2B.html)

[이전: 람다 표현식](/?post=effective-modern-cpp-06-lambda-expressions) · [개요](/?post=effective-modern-cpp-overview) · [다음: 세부 조정](/?post=effective-modern-cpp-08-tweaks)
