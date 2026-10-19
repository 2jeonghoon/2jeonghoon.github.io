---
title: "15: 코루틴의 세부 규칙"
description: "코루틴 프레임과 promise, 예외, 메모리 할당, 대칭 전송과 동시 재개의 위험을 공부합니다."
date: "2026-10-19"
order: 15
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Coroutines", "Awaiter", "Memory"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 15.1 코루틴의 제약과 람다

생성자와 소멸자, `main`, 가변 인자 함수 등에는 코루틴 본문을 사용할 수 없다.
일반 함수에 중단 구문 하나를 추가하면 반환 인터페이스와 수명 모델까지 바뀐다는 점이 핵심이다.
생성자를 비동기로 만드는 대신, 별도 팩터리 코루틴을 설계하는 식으로 경계를 분리한다.

캡처가 있는 코루틴 람다는 특히 주의한다.
클로저가 프레임으로 통째로 복사된다고 생각하면 호출 직후 파괴된 클로저의 캡처에 접근할 수 있다.
캡처 대신 명시적 값 인자로 넘기는 방법을 우선 검토한다.

```cpp
// 인터페이스 조각: Task는 프로젝트에서 정의한 코루틴 반환 타입이다.
// 아래 선언은 독립 실행 프로그램이 아니다.
Task load_by_value(std::string path); // 값 인자를 프레임에 보관
// [path = std::string{"data"}]() -> Task { co_await ...; }();
// 임시 클로저에서 중단 후 path를 쓰는 설계는 피한다.
```

## 15.2 프레임과 promise의 관계

프레임은 인자 복사본, promise, 중단 지점 정보, 중단을 가로질러 살아 있는 지역 객체 등을 보관한다.
promise는 라이브러리가 실행 결과와 제어 정책을 연결하는 사용자 정의 타입이다.
이름이 비슷해도 `std::promise`와 동일한 타입일 필요는 없다.

호출 인터페이스가 핸들을 소유하고, 핸들이 프레임을 지칭하며, 프레임에 promise가 있다는 관계를 먼저 그린다.
프레임 안에서 꺼낸 참조를 호출자에게 넘기면 프레임 파괴 시점이 그 참조의 수명 끝이 될 수 있다.
완료된 작업과 파괴된 프레임도 별개의 상태다.

## 15.3 promise의 필수·선택 연산

`get_return_object()`는 호출자용 반환 객체를 만든다.
`initial_suspend()`는 본문 시작 정책을, `final_suspend()`는 종료 후 프레임 유지와 continuation 처리를 정한다.
`unhandled_exception()`은 본문에서 처리되지 않은 예외의 도착점이다.

결과 타입은 `return_value()` 또는 `return_void()`를 제공하고, yield를 지원하면 `yield_value()`를 추가한다.
선택적인 `await_transform()`은 본문 안의 await 식을 라이브러리 정책에 맞게 변환할 수 있다.
프레임 할당을 조절하는 `operator new` 등도 promise를 통해 찾을 수 있다.

모든 훅을 처음부터 구현하는 것보다 실행 시점, 소유권, 결과 전달부터 최소로 정하는 편이 검토하기 쉽다.
특히 `final_suspend()` 경로에서는 예외가 흘러나오지 않도록 해야 한다.

## 15.4 핸들은 소유 스마트 포인터가 아니다

핸들을 복사해도 프레임의 소유권이 복제되거나 참조 횟수가 증가하지 않는다.
`resume()`, `done()`, `destroy()`는 해당 프레임이 유효하고 요구 상태에 있을 때만 사용한다.
최종 중단 지점에 있는 코루틴을 다시 resume하는 것은 올바르지 않다.

```cpp
#include <coroutine>
#include <utility>

class SuspendedFrame {
    std::coroutine_handle<> h_{};
public:
    // 전제: h가 비어 있거나, 현재 중단된 프레임의 유일 소유권을 넘긴다.
    explicit SuspendedFrame(std::coroutine_handle<> h) noexcept : h_(h) {}
    SuspendedFrame(const SuspendedFrame&) = delete;
    SuspendedFrame& operator=(const SuspendedFrame&) = delete;
    SuspendedFrame(SuspendedFrame&& other) noexcept
        : h_(std::exchange(other.h_, {})) {}
    ~SuspendedFrame() { if (h_) h_.destroy(); }
};

int main() {
    SuspendedFrame empty{std::coroutine_handle<>{}};
}
```

이 코드는 소유권 전달 패턴만 보여 준다. 실행 중인 프레임을 파괴해도 안전하다는 뜻이 아니다.
`coroutine_handle<void>`는 promise 타입을 지운 제어용 핸들이므로 특정 promise 멤버에 바로 접근할 수 없다.
타입을 지웠다고 수명이나 동시 접근 제한까지 사라지지는 않는다.

## 15.5 예외 전달

실용 task는 보통 `std::exception_ptr`에 예외를 저장하고 결과를 꺼낼 때 다시 던진다.
`unhandled_exception()`에서 무조건 삼키면 실패한 작업이 성공처럼 보일 수 있다.
취소, 실패, 정상 반환을 반환 인터페이스에서 어떻게 구별할지도 함께 정한다.

프레임 할당이나 인자 복사처럼 본문 진입 이전에 실패하는 단계와 본문 실행의 실패를 분리해서 생각한다.
예외가 발생했을 때도 핸들 소유 객체가 프레임을 정리하는지 확인한다.

## 15.6 메모리 할당

프레임은 동적 할당될 수 있지만 조건에 따라 할당이 생략될 수 있다.
프레임 크기와 호출 관계가 최적화에 영향을 주므로, 일반 함수와 비용이 같다고 가정하지 않는다.
`get_return_object_on_allocation_failure()`를 제공하는 설계에서는 실패 시 반환할 객체와 비투척 할당 규칙을 함께 지켜야 한다.

풀 할당기를 추가하려면 실행뿐 아니라 프레임 파괴가 어느 스레드에서 일어나는지도 고려한다.
성능 개선 전에 측정하고, 예외 경로와 조기 파괴 경로를 먼저 검증한다.

## 15.7 awaiter와 대칭 전송

`await_suspend()`가 `void`를 반환하면 중단하고, `bool`을 반환하면 거짓일 때 현재 코루틴을 계속 진행한다.
다른 코루틴 핸들을 반환하면 그 코루틴으로 실행을 넘기는 대칭 전송을 구성할 수 있다.
부모를 재개하기 위해 매번 일반 재귀 호출을 쌓는 설계와 다른 제어 흐름이다.

`await_resume()`의 반환값은 `co_await` 식의 결과다.
반환값 없이 완료만 알리거나, 저장된 예외를 이 지점에서 다시 던지는 awaiter도 가능하다.
핸들을 다른 스레드에 공개한 뒤에는 해당 스레드가 즉시 재개할 수 있음을 고려한다.

## 15.8 await 식을 가공하는 두 위치

promise의 `await_transform()`은 그 코루틴 본문에서 허용하는 대기 정책을 정하는 데 쓰인다.
타입의 `operator co_await()`는 awaitable 객체를 실제 awaiter로 바꾸는 확장점이다.
두 단계를 같은 것으로 생각하면 라이브러리 조합 시 어떤 함수가 선택되는지 놓치기 쉽다.

## 15.9 동시 사용과 15.10 coroutine_traits

스레드 풀은 준비된 핸들을 큐에 넣고 실행할 스레드를 선택한다.
한 프레임에 대한 재개·파괴가 경합하지 않게 소유권과 상태 전이를 동기화해야 한다.
취소 요청은 프레임을 임의로 파괴해도 된다는 허가가 아니다.

`coroutine_traits<Return, Args...>`는 반환 타입과 인자로 promise 타입을 결정하는 연결점이다.
표준은 저수준 코루틴 기구를 제공하지만 C++20에 범용 task·generator·이벤트 루프까지 들어 있지는 않다.

## 복습 질문

- 중단된 프레임의 마지막 소유자는 누구인가?
- 완료 후 재개와 프레임 파괴의 전제 조건은 무엇인가?
- await_suspend가 핸들을 공개한 뒤 객체를 다시 만지는가?
- 본문 실패와 프레임 할당 실패를 다른 경로로 처리하는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 코루틴 함수](https://timsong-cpp.github.io/cppwp/n4861/dcl.fct.def.coroutine)
- [C++20 초안 N4861: await 식과 전송](https://timsong-cpp.github.io/cppwp/n4861/expr.await)
- [C++20 초안 N4861: coroutine_handle](https://timsong-cpp.github.io/cppwp/n4861/coroutine.handle)
