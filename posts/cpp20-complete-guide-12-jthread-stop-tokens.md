---
title: "12: jthread와 중단 토큰"
description: "jthread의 자동 join, 협력적 중단, stop_callback과 조건 변수의 종료 프로토콜을 공부합니다."
date: "2026-10-19"
order: 12
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Concurrency", "jthread", "stop_token"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 12.1 왜 jthread가 필요한가?

`std::thread` 객체가 아직 join 가능한 상태로 소멸하면 프로그램은 종료된다.
정상 경로에서 `join()`을 호출해도 중간에 예외가 발생하면 그 호출을 건너뛸 수 있다.
`std::jthread`는 소멸 때 중단을 요청하고, join 가능한 실행을 기다려 이 관리 부담을 줄인다.

```cpp
#include <thread>
#include <atomic>
#include <cassert>

int main() {
    std::atomic<int> turns{0};
    {
        std::jthread worker([&](std::stop_token stop) {
            while (!stop.stop_requested()) {
                turns.fetch_add(1, std::memory_order_relaxed);
            }
        });
        worker.request_stop();
    } // join이 끝난 뒤 다음 문장으로 진행
    assert(turns.load() >= 0);
}
```

이 예제의 반복 횟수는 스케줄링에 따라 0일 수도 있다.
소멸은 중단 요청이 실제 작업에 반영될 때까지 기다릴 수 있으므로 일정 시간 안에 끝난다는 보장은 없다.
멈추지 않는 작업을 `jthread`로 감싼다고 자동으로 취소할 수 있는 것은 아니다.

### 12.1.3 중단 콜백과 12.1.4 조건 변수

반복문이 토큰을 검사하면 CPU 작업을 중단할 수 있지만, 대기 중인 스레드는 검사 지점에 도달하지 못한다.
C++20에는 `condition_variable_any`의 토큰을 받는 대기 오버로드가 있다.
다음 예제는 공유 상태 변경 없이 중단 요청만으로 대기를 종료한다.

```cpp
#include <condition_variable>
#include <mutex>
#include <thread>

int main() {
    std::mutex mutex;
    std::condition_variable_any changed;
    bool ready = false;
    std::jthread worker([&](std::stop_token stop) {
        std::unique_lock lock(mutex);
        if (!changed.wait(lock, stop, [&] { return ready; })) {
            return; // 중단 요청 후에도 predicate가 거짓
        }
        // ready와 관련된 작업은 lock 아래에서 처리한다.
    });
    worker.request_stop();
}
```

반환값은 predicate의 결과다. `true`를 받았다고 중단 요청이 없었다고 단정하지 않는다.
일반 `condition_variable`에 같은 토큰 오버로드가 있다고 가정하면 안 된다.

## 12.2 stop_source와 stop_token

`stop_source`는 중단을 요청할 권한이고 `stop_token`은 그 요청을 관찰할 수단이다.
둘은 공유 중단 상태를 가리킨다. 토큰을 복사해서 여러 작업에 동일한 취소 범위를 전달할 수 있다.
한번 요청한 상태를 다시 실행 상태로 되돌릴 수는 없다. 재시작에는 새 source를 사용한다.

```cpp
#include <stop_token>
#include <cassert>

int main() {
    std::stop_source source;
    auto token = source.get_token();
    int callbacks = 0;
    std::stop_callback on_stop(token, [&]() noexcept { ++callbacks; });
    assert(source.request_stop());
    assert(!source.request_stop());
    assert(token.stop_requested());
    assert(callbacks == 1);
}
```

### 12.2.2 콜백의 실행 위치

이 예제의 콜백은 첫 `request_stop()`을 호출하는 스레드에서 동기적으로 실행된다.
이미 중단된 토큰으로 콜백을 등록하면 등록 과정에서 바로 호출될 수도 있다.
따라서 콜백이 나중에 전용 이벤트 스레드에서 실행될 것이라고 가정하면 안 된다.

콜백은 예외를 밖으로 내보내지 않게 작성한다.
중단을 요청하는 쪽이 보유한 뮤텍스를 콜백에서도 잠그면 교착 위험이 생긴다.
객체 파괴와 콜백 실행이 경합할 수 있으므로 캡처한 상태의 수명도 종료 설계에 포함한다.

### 12.2.3 보장과 한계

중단 상태의 요청과 관찰은 스레드 사이에서 사용할 수 있지만, 별도 작업 데이터까지 모두 안전해지는 것은 아니다.
공유 큐는 여전히 자체 뮤텍스나 원자적 프로토콜이 필요하다.
콜백의 호출 순서에 의존해 자원 정리 단계를 구성하지 않는다.

## 12.3 jthread의 세부 규칙

호출 대상이 첫 인자로 `stop_token`을 받을 수 있으면 `jthread`가 자체 토큰을 전달한다.
토큰을 받지 않는 callable도 실행할 수 있지만, 그 작업은 자동 중단 요청을 직접 관찰하지 않는다.
`request_stop()`은 join이 아니므로 요청 직후에는 작업이 계속 실행 중일 수 있다.

클래스 멤버로 `jthread`를 둘 때는 멤버 소멸 순서를 확인한다.
스레드가 참조하는 데이터가 먼저 파괴되면 자동 join만으로 수명 오류를 막지 못한다.
종료 함수에서 요청과 join을 수행하거나, 의존 데이터보다 스레드가 먼저 파괴되도록 선언 순서를 정한다.

## 12.4 학습 정리와 복습 질문

- 예외가 발생해도 실행 중인 스레드를 누가 기다리는가?
- 작업이 대기 중일 때 중단 요청이 검사 지점까지 어떻게 전달되는가?
- 콜백이 요청 스레드에서 즉시 실행되어도 잠금 순서가 안전한가?
- 취소 요청과 작업 완료를 서로 다른 사건으로 설명할 수 있는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 중단 토큰](https://timsong-cpp.github.io/cppwp/n4861/thread.stoptoken)
- [C++20 초안 N4861: 스레드와 jthread](https://timsong-cpp.github.io/cppwp/n4861/thread.threads)
- [C++20 초안 N4861: condition_variable_any](https://timsong-cpp.github.io/cppwp/n4861/thread.condition.condvarany)
