---
title: "14: 코루틴의 기본 구조"
description: "일시 중단 가능한 함수의 프레임, promise, handle, co_yield와 awaiter를 연결합니다."
date: "2026-10-19"
order: 14
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Coroutines", "Lifetime"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 14.1 코루틴은 중단 지점을 가진 함수다

C++20 코루틴은 `co_await`, `co_yield`, `co_return`으로 실행을 나누는 언어 기능이다.
함수가 중단되어도 지역 상태는 코루틴 프레임에 남는다.
재개할 스레드, 이벤트 루프, 작업 스케줄러는 이 문법만으로 생기지 않는다.

호출자는 보통 함수의 반환 객체를 통해 프레임에 접근한다.
일반 함수의 `return` 값과 코루틴의 반환 인터페이스를 같은 것으로 생각하면 `promise_type`이 왜 필요한지 이해하기 어렵다.
반환 객체는 제어 인터페이스이고, `co_return`의 결과는 promise를 통해 별도로 전달될 수 있다.

## 14.2 첫 코루틴: 두 번에 나눠 진행하기

다음 예제는 학습을 위한 최소 소유 타입이다.
처음 호출할 때 멈추며, 호출자가 `resume()`할 때마다 다음 중단 지점까지 실행한다.
복사를 금지해 프레임을 두 번 파괴하는 실수를 막는다.

```cpp
#include <coroutine>
#include <exception>
#include <cassert>

class Stepper {
public:
    struct promise_type;
    using Handle = std::coroutine_handle<promise_type>;
    struct promise_type {
        Stepper get_return_object() {
            return Stepper{Handle::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_void() noexcept {}
        void unhandled_exception() { std::terminate(); }
    };
    explicit Stepper(Handle h) : handle_(h) {}
    Stepper(const Stepper&) = delete;
    Stepper& operator=(const Stepper&) = delete;
    ~Stepper() { if (handle_) handle_.destroy(); }
    bool resume() {
        if (!handle_ || handle_.done()) return false;
        handle_.resume();
        return !handle_.done();
    }
private:
    Handle handle_;
};

Stepper update(int& state) {
    state = 1;
    co_await std::suspend_always{};
    state = 2;
}

int main() {
    int state = 0;
    auto task = update(state);
    assert(state == 0);
    assert(task.resume());
    assert(state == 1);
    assert(!task.resume());
    assert(state == 2);
}
```

이 예제는 C++17 이후의 보장된 복사 생략으로 반환 객체를 직접 만든다.
일반 컨테이너에 넣을 실용 타입으로 만들려면 핸들을 넘겨주는 이동 연산도 설계해야 한다.
`final_suspend()`에서 프레임을 남겨 두었기 때문에 소유 객체가 `destroy()`한다.

### 14.2.3 참조 인자와 수명

`update()`의 `state`는 프레임이 소유하는 정수 복사본이 아니라 외부 객체의 참조다.
호출이 반환되었다고 참조 사용이 끝난 것이 아니다.
예제에서는 `state`가 task보다 먼저 선언되어 task가 먼저 소멸하므로 안전하다.

참조 대신 값을 받으면 값 인자의 복사본은 프레임에 보관할 수 있다.
그러나 `string_view`, 포인터, span처럼 값 자체가 빌린 참조인 타입은 여전히 외부 수명에 의존한다.
코루틴이 다른 코루틴을 호출할 때도 이 소유권 경계는 유지된다.

### 14.2.5 인터페이스·핸들·promise 연결

컴파일러는 반환 타입에서 promise 타입을 찾고, promise가 `get_return_object()`로 호출자에게 객체를 돌려준다.
`coroutine_handle<promise_type>`은 그 프레임을 제어하고 promise를 찾을 수 있는 핸들이다.
핸들 자체에는 유일 소유권이 없으므로 위와 같은 RAII 인터페이스가 그 책임을 맡는다.
프레임 메모리 할당은 구현이 최적화할 수 있지만, 항상 스택에만 놓인다고 단정하지 않는다.

## 14.3 값을 내보내기와 끝내기

`co_yield expression`은 promise의 `yield_value(expression)`을 통해 중간 값을 전달한다.
`co_return expression`은 `return_value(expression)`을 통해 최종 결과를 전달한다.
값 없이 끝내는 인터페이스는 `return_void()`를 제공한다.

같은 promise에 `return_void()`와 `return_value()`를 동시에 제공하지 않는다.
`co_yield`가 돌려준 참조가 다음 재개 이후에도 유효한지는 generator 인터페이스의 계약에 달려 있다.
C++20 표준 라이브러리에는 `std::generator`가 없다. 이는 이후 표준 기능이므로 이 장에서는 직접 만든 타입과 구분한다.

## 14.4 awaitable과 awaiter

awaiter는 `await_ready()`, `await_suspend(handle)`, `await_resume()`로 중단 과정을 제어한다.
ready가 참이면 중단 단계를 건너뛰고 resume 결과를 얻는다.
suspend에서는 후속 실행을 등록할 수 있고, resume에서는 값이나 예외를 호출 식으로 전달할 수 있다.

`std::suspend_always`는 항상 중단하고 `std::suspend_never`는 중단하지 않는 표준 awaiter다.
서브 코루틴 완료 후 부모를 재개하는 기능은 이 프로토콜을 구현한 라이브러리에서 제공해야 한다.
`co_await`가 어떤 타입에나 자동으로 적용되는 것은 아니다.

## 14.5 복습 질문

- 첫 호출에서 본문이 실행되는가, initial_suspend에서 멈추는가?
- 프레임 파괴를 담당하는 객체는 누구인가?
- 참조 인자가 마지막 재개까지 살아 있는가?
- 코루틴 문법과 스케줄러의 책임을 구분할 수 있는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 코루틴 함수 변환](https://timsong-cpp.github.io/cppwp/n4861/dcl.fct.def.coroutine)
- [C++20 초안 N4861: co_await](https://timsong-cpp.github.io/cppwp/n4861/expr.await)
- [C++20 초안 N4861: 코루틴 지원](https://timsong-cpp.github.io/cppwp/n4861/support.coroutine)
