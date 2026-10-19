---
title: "Effective Modern C++: 타입 추론부터 동시성까지 핵심 정리"
description: "Scott Meyers의 Effective Modern C++를 공부하기 위한 주제별 노트. 타입 추론, 초기화, 스마트 포인터, 이동과 전달, 람다, 동시성의 판단 기준을 예제로 정리합니다."
date: "2026-10-19"
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++", "Effective Modern C++", "C++11", "C++14", "Move Semantics", "Smart Pointer"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

## 어떤 책을 기준으로 공부할까?

기준 도서는 Scott Meyers의 **『Effective Modern C++』(O'Reilly, 2014)**다. C++11/14의 기능을 올바르게 사용하는 42개 항목을 다루며, 이 블로그의 기존 『Effective C++』 노트에서 소유권과 현대적인 문법으로 공부를 이어가기 좋다. 서지와 범위는 [저자의 도서 소개](https://www.aristeia.com/books.html)에서 확인할 수 있다.

이 글은 공개된 공식 목차와 저자 자료로 학습 주제를 선정하고, 언어 규칙을 참고해 재구성한 **핵심 개념 공부 노트**다. 책 전체 본문을 읽고 항목별로 완역한 요약은 아니다. 예제는 이 노트를 위해 작성했으며, 각 코드 블록은 별개의 예제다. C++17/20의 내용은 마지막 보충 절에서 구분한다.

## 전체 학습 지도

학습 순서는 이 책을 먼저 공부한 뒤 [C++20 — The Complete Guide 학습 안내](/?post=cpp20-complete-guide-overview)로 넘어가는 것으로 잡는다. 이 책에서는 타입 추론·수명·소유권·이동·템플릿·람다·동시성의 판단 기준을 익히고, 다음 책에서는 C++20의 추가 기능을 장 순서대로 공부한다.

장별 초안은 아래 목차에서 찾아갈 수 있다. 초안 단계에서는 공개 사이트의 글 목록과 글 링크로 열리지 않을 수 있으며, 저장소 또는 관리자 편집 화면에서 확인한다.

| 장 | 공부 노트 | 항목 |
| --- | --- | --- |
| 1 | [타입 추론](/?post=effective-modern-cpp-01-deducing-types) | 1–4 |
| 2 | [auto](/?post=effective-modern-cpp-02-auto) | 5–6 |
| 3 | [현대 C++로 옮겨가기](/?post=effective-modern-cpp-03-moving-to-modern-cpp) | 7–17 |
| 4 | [스마트 포인터](/?post=effective-modern-cpp-04-smart-pointers) | 18–22 |
| 5 | [우측값 참조·이동·완벽 전달](/?post=effective-modern-cpp-05-rvalue-references-move-forwarding) | 23–30 |
| 6 | [람다 표현식](/?post=effective-modern-cpp-06-lambda-expressions) | 31–34 |
| 7 | [동시성 API](/?post=effective-modern-cpp-07-concurrency-api) | 35–40 |
| 8 | [값 전달과 emplacement](/?post=effective-modern-cpp-08-tweaks) | 41–42 |

장별 글에서 항목 순서대로 공부하고, 아래 종합 정리는 복습에 사용한다. 예제의 표준 범위는 기본적으로 C++11/14이며 이후 변경은 별도 보충으로 구분한다.

[출판사 공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 구성을 기준으로 공부 순서를 잡는다. 아래 질문은 복습할 때 사용할 질문이다.

| 주제 | 항목 범위 | 복습 질문 |
| --- | --- | --- |
| 타입 추론 | 1–4 | 이 선언은 값을 복사하는가, 참조를 유지하는가? |
| auto | 5–6 | 생략한 타입이 의도한 타입과 같은가? |
| 현대 C++의 기본 도구 | 7–17 | 초기화와 인터페이스에서 실수를 컴파일러가 잡는가? |
| 스마트 포인터 | 18–22 | 자원을 소유하는 주체와 해제 시점은 무엇인가? |
| 이동과 완벽 전달 | 23–30 | 이 표현식은 실제로 어떤 생성자를 선택하는가? |
| 람다 | 31–34 | 콜백이 실행될 때 캡처 대상은 살아 있는가? |
| 동시성 API | 35–40 | 실행 정책, 종료, 동기화가 명시되어 있는가? |
| 값 전달과 emplacement | 41–42 | 더 짧은 코드가 실제로 비용을 줄이는가? |

이하에서는 모든 항목을 같은 분량으로 나열하기보다 실수하기 쉬운 규칙과 판단 기준을 중심으로 정리한다.

## 1. 타입 추론: 값과 참조를 먼저 구분한다

```cpp
const int health = 100;
const int& original = health;

auto copy = original;         // int: 별개의 값
auto& reference = original;   // const int&: 원본 참조
const auto& view = original;  // const int&: 읽기 전용 참조
```

값으로 선언한 `auto`는 초기화 식이 참조하던 객체를 복사한다. 이때 최상위 `const`와 참조는 보존하지 않는다. 반대로 `auto&`를 쓰면 참조 대상의 `const`가 유지된다. 따라서 `auto`를 볼 때는 생략한 타입 이름보다 **선언에 붙인 `&`와 `const`**를 먼저 읽는다.

`decltype`은 다른 규칙을 사용한다. 괄호 없는 이름에는 선언된 타입을 얻지만, 일반 표현식에는 값 범주도 반영한다.

```cpp
int score = 10;
decltype(score) value = score;    // int
decltype((score)) alias = score;  // int&: (score)는 lvalue 표현식
alias = 20;                      // score도 20
```

C++14의 `decltype(auto)`는 이 규칙으로 타입을 추론한다. 반환식의 괄호 하나로 참조 반환이 될 수 있으므로, 지역 변수의 참조를 반환하지 않도록 주의한다. 실험할 때는 `<type_traits>`의 `std::is_same`과 `static_assert`로 추론 결과를 확인하면 된다. [타입 추론 규칙](https://eel.is/c++draft/dcl.spec.auto)

### auto가 복사를 의미하지 않는 경우도 있다

`std::vector<bool>`의 원소 접근은 일반적인 `bool&` 대신 프록시 객체를 반환한다. `auto flag = bits[0];`가 독립된 `bool` 스냅샷이라고 단정하면 안 된다. 그 목적이라면 `bool flag = bits[0];`처럼 타입을 명시한다. 표현식 템플릿이나 뷰도 실제 값 대신 원본을 참조하는 객체를 돌려줄 수 있다.

## 2. 초기화: 중괄호가 항상 같은 의미는 아니다

```cpp
#include <vector>

std::vector<int> slots(3, 10);  // 10, 10, 10
std::vector<int> values{3, 10}; // 3, 10

auto list = {10};              // std::initializer_list<int>
int count{10};
// int narrowed{3.5};          // 오류: narrowing conversion
```

중괄호는 축소 변환을 제한하지만, 생성자 선택에서는 `std::initializer_list` 오버로드가 우선될 수 있다. 컨테이너의 원소 목록인지, 크기와 초기값인지 구분해야 한다. `auto x{10}`은 초기 표준 문구와 이후 결함 수정의 차이가 있어 오래된 설명을 그대로 외우기 쉽다. 수정된 규칙을 적용하는 컴파일러에서는 단일 원소 직접 목록 초기화인 `auto x{10}`이 `int`이고, `auto x = {10}`은 초기화 목록이다.

타입 추론과 초기화 규칙은 분리해서 생각한다. `auto`를 쓴다는 이유만으로 `{}`를 일괄 적용하지 않는다.

## 3. 인터페이스: 의도를 컴파일러가 검사하게 만든다

`nullptr`는 널 포인터의 의도를 나타내고, `enum class`는 서로 다른 열거형 사이의 암시적 변환을 제한한다. `= delete`는 금지한 호출을 선언에 드러내며, `override`는 기반 클래스 함수와 실제로 일치하는지 검사한다.

```cpp
enum class State { Idle, Running };

class Session {
public:
    Session() = default;
    Session(const Session&) = delete;
    Session& operator=(const Session&) = delete;
};

struct Actor {
    virtual ~Actor() = default;
    virtual void Tick(float delta) = 0;
};

struct Player : Actor {
    void Tick(float delta) override { (void)delta; }
};
```

특수 멤버 함수를 직접 선언하면 다른 복사·이동 연산의 암시적 생성에 영향을 준다. 위 `Session`은 복사를 금지했지만 이동 가능 타입으로 만든 것은 아니다. 이동이 필요하다면 자원의 의미에 맞게 이동 연산도 설계해야 한다. 대부분의 값 타입은 표준 컨테이너와 자원 관리 타입에 맡기는 Rule of Zero부터 검토한다.

`constexpr`는 상수 평가에 사용할 수 있다는 뜻이다. 인수와 호출 문맥이 상수 평가 조건을 만족하지 않으면 런타임에도 실행될 수 있다. `const` 멤버 함수 역시 동시 호출의 안전성을 자동으로 보장하지 않는다. 내부 캐시를 `mutable`로 갱신한다면 별도의 동기화가 필요하다.

`noexcept`는 실패를 무시하라는 표시가 아니다. 예외가 밖으로 빠져나오면 `std::terminate`로 이어지는 계약이다. 컨테이너의 재배치 전략에도 영향을 줄 수 있으므로 실제로 예외를 내보내지 않는 연산에 붙인다. [예외 명세 규칙](https://eel.is/c++draft/except.spec)

## 4. 스마트 포인터: 소유권부터 결정한다

| 표현 | 소유권 | 사용 의도 |
| --- | --- | --- |
| 값 객체 | 객체 자체가 수명을 관리 | 기본 선택 |
| `std::unique_ptr<T>` | 단독 소유 | 동적 객체의 주인이 하나 |
| `std::shared_ptr<T>` | 공유 소유 | 여러 주체가 수명을 함께 연장 |
| `std::weak_ptr<T>` | 수명을 연장하지 않음 | 공유 객체를 관찰하고 순환 소유를 끊음 |
| `T&`, `T*` | 자체적으로 소유권을 표현하지 않음 | 수명이 보장된 객체를 빌려 사용 |

```cpp
#include <memory>
#include <utility>

struct Job { int priority = 1; };

auto pending = std::make_unique<Job>(); // C++14
auto running = std::move(pending);      // 소유권 이전
// pending은 비어 있고 running이 Job을 소유한다.

auto owner = std::make_shared<Job>();
std::weak_ptr<Job> observer = owner;
if (auto locked = observer.lock()) {
    locked->priority = 2; // locked가 살아 있는 동안 객체 수명 확보
}
```

스마트 포인터는 자원 수명과 해제를 다루는 도구다. `shared_ptr`로 같은 객체를 가리킨다고 객체 내부의 동시 쓰기가 안전해지지는 않는다. 서로를 소유하는 `shared_ptr` 관계는 참조 횟수가 0이 되지 않게 만들 수 있으므로 역방향 연결의 소유권을 검토한다. 일반적인 판단 순서는 값 객체, 단독 소유, 필요한 경우의 공유 소유다. [소유권 설계 지침](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rsmart)

PImpl에서는 구현 타입이 불완전한 헤더와 실제 해제가 일어나는 위치도 중요하다. `unique_ptr<Impl>`을 멤버로 두었다면, `Impl`이 완전히 정의된 구현 파일에서 소멸자를 정의하는 패턴을 검토한다.

## 5. 이동: std::move는 자원을 옮기는 함수가 아니다

`std::move`는 인수를 rvalue로 취급할 수 있게 변환한다. 실제 자원 이전은 그 뒤 선택되는 이동 생성자나 이동 대입 연산자가 수행한다. [move와 forward의 표준 정의](https://eel.is/c++draft/forward)

```cpp
#include <string>
#include <utility>

std::string source = "packet";
std::string target = std::move(source);
// source의 내용이 빈 문자열이라고 가정하지 않는다.

const std::string fixed = "snapshot";
std::string copied = std::move(fixed); // 일반적인 string 이동 대신 복사
```

`const` 객체에 `std::move`를 적용해도 `const`는 사라지지 않는다. `std::string`의 이동 생성자는 보통 `std::string&&`를 받으므로 `const std::string&&`가 된 식에는 복사 생성자가 선택된다.

이동 후 상태의 계약은 타입별로 확인한다. 표준 라이브러리 타입은 별도 명세가 없으면 유효하지만 값이 명시되지 않은 상태가 되는 것이 일반적이다. 다시 대입하거나 파괴할 수는 있지만 이전 내용이 남아 있다고 가정하지 않는다. 앞의 `unique_ptr`처럼 이동 후 비어 있음이 명세된 타입은 그 보장을 이용할 수 있다.

### 반환값에 습관적으로 std::move를 붙이지 않는다

```cpp
#include <string>

std::string MakeName() {
    std::string result = "Player";
    return result; // NRVO 기회, 적용되지 않으면 이동 가능한 문맥
}
```

`return std::move(result);`는 이름 있는 지역 변수의 반환값 최적화(NRVO)를 막을 수 있다. 성능은 이동 호출 횟수를 늘리는 것이 아니라 불필요한 생성 자체를 줄이는 방향으로 판단한다.

## 6. 완벽 전달: T&&의 의미는 추론 여부에 달려 있다

```cpp
#include <string>
#include <utility>

void Consume(const std::string&) {}
void Consume(std::string&&) {}

template <typename T>
void Relay(T&& value) {                // forwarding reference
    Consume(std::forward<T>(value));   // 호출자의 값 범주를 전달
}

void Take(std::string&& value) {       // 구체적 타입의 rvalue reference
    Consume(std::move(value));
}
```

추론되는 cv 비한정 타입 매개변수에 대한 `T&&`는 forwarding reference로 동작할 수 있다. `const T&&`나 이미 정해진 클래스 템플릿 매개변수의 `T&&`까지 모두 같은 경우로 분류하면 안 된다. 책의 universal reference라는 용어는 이 문맥에서 만나는 표현이다.

함수 안에서는 이름이 있는 `value` 표현식이 lvalue다. 전달 함수에서는 `std::forward<T>`로 원래 값 범주를 복원한다. 무조건 `std::move`를 쓰면 호출자가 넘긴 lvalue까지 이동 대상으로 취급하게 된다.

참조 축약은 `&`가 섞이면 `&`가 되고 `&&`끼리만 `&&`가 된다. 이 규칙 덕분에 `Relay(name)`과 `Relay(std::string{"name"})`이 서로 다른 전달 동작을 유지한다. 다만 `{1, 2}`처럼 타입 추론이 불가능한 인수나 비트 필드 등에서는 전달이 막힐 수 있다. 완벽 전달은 모든 표현식을 무조건 통과시키는 장치가 아니다.

## 7. 람다: 캡처는 수명에 관한 결정이다

```cpp
#include <memory>
#include <utility>

auto task = [job = std::make_unique<int>(42)] {
    return *job;
}; // C++14 init capture: 클로저가 자원을 소유
```

참조 캡처는 원본 수명을 연장하지 않는다. 나중에 실행할 콜백에서 지역 변수를 `[&]`로 잡으면 함수 반환 뒤 참조가 끊길 수 있다. `[=]`도 만능은 아니다. 포인터를 복사해도 대상 객체를 복사한 것은 아니며, C++11/14에서 멤버를 사용하는 람다의 암시적 `this` 캡처는 객체 전체의 복사본을 보관하지 않는다. [람다 캡처 규칙](https://eel.is/c++draft/expr.prim.lambda.capture)

게임 코드에서 특히 확인할 부분은 예약된 작업이 실행되기 전에 액터나 세션이 제거될 수 있는지다. 필요한 값만 복사하거나, 적절한 약한 참조를 캡처하고 실행 시점에 생존 여부를 확인한다. Unreal의 `UObject` 수명은 엔진의 참조 체계를 따르므로 일반 C++ 스마트 포인터 규칙을 그대로 적용하지 않는다.

init capture로 `unique_ptr`를 소유한 위 클로저는 복사할 수 없다. C++11/14의 `std::function`에 넣으려는 경우에는 복사 가능 요구 사항까지 확인해야 한다. 캡처를 고친 뒤에도 콜백을 저장하는 컨테이너의 계약은 남는다.

## 8. 동시성: 실행과 종료를 함께 설계한다

```cpp
#include <future>

int CalculateScore(int level) { return level * 100; }

int RunCalculation() {
    auto result = std::async(std::launch::async, CalculateScore, 3);
    return result.get(); // 완료를 기다리고 결과 또는 예외를 받는다.
}
```

기본 실행 정책의 `std::async`는 지연 실행을 선택할 수 있다. 호출자가 별도의 실행 스레드에서 수행되기를 요구한다면 `std::launch::async`를 명시한다. 이때도 실행 자원을 확보하지 못하는 실패 가능성은 있다. 반환된 `future`를 바로 파괴하면 비동기 실행을 기다리는 상황이 생길 수 있으므로, 호출만 했다고 항상 즉시 다음 작업과 겹쳐 실행된다고 생각하면 안 된다. [async의 실행 정책과 반환 상태](https://eel.is/c++draft/futures.async)

직접 만든 `std::thread`는 모든 경로에서 `join` 또는 의도한 `detach` 처리가 필요하다. joinable 상태인 `thread` 객체가 파괴되면 프로그램이 종료된다. `detach`는 참조 대상 수명을 해결하지 않으므로 단순한 회피책으로 사용하지 않는다.

공유 상태는 mutex나 atomic으로 명확히 동기화한다. `volatile`은 스레드 간 동기화 수단이 아니다. atomic 변수 하나를 사용해도 여러 변수 사이의 불변식이나 복합 연산 전체가 자동으로 보호되지는 않는다.

## 9. 값 전달과 emplacement: 비용 모델을 읽는다

```cpp
#include <string>
#include <utility>

class Profile {
public:
    explicit Profile(std::string name) : name_(std::move(name)) {}
private:
    std::string name_;
};
```

인수를 언제나 저장하고 이동 비용이 작은 타입이라면 값으로 받은 뒤 이동하는 방식이 인터페이스를 단순하게 만든다. lvalue는 매개변수로 복사한 뒤 멤버로 이동하고, rvalue는 이동하거나 복사가 생략될 수 있다. 반면 기존 멤버에 반복 대입하면서 저장 공간을 재사용하는 상황에서는 `const&`로 받아 복사 대입하는 편이 유리할 수 있다. 크고 복사가 비싼 타입에 일괄 적용할 규칙은 아니다.

`emplace_back(args...)`는 전달한 인수로 컨테이너 안의 원소를 직접 생성할 수 있다. 이미 완성된 객체를 넘기는 `emplace_back(object)`는 여전히 복사나 이동을 할 수 있다. `push_back`보다 항상 빠르다는 결론 대신, 임시 객체가 실제로 줄어드는지와 선택되는 생성자가 무엇인지 확인한다.

## C++17/20 보충: 책의 범위와 분리해서 읽기

아래는 C++11/14를 다루는 책 이후의 공부 주제다. 현재 표준 초안을 참고할 때도 책 출간 당시의 규칙과 구분해야 한다.

| 이후 기능 | 이어서 공부할 질문 |
| --- | --- |
| C++17 보장된 복사 생략 | 같은 타입의 prvalue로 직접 초기화하는 경우와 NRVO는 어떻게 다른가? |
| C++17 `if constexpr` | 인스턴스화할 분기를 어떻게 제한하는가? |
| C++17 `std::string_view` | 뷰가 가리키는 문자열은 언제까지 살아 있는가? |
| C++20 concepts | 템플릿이 받을 수 있는 타입을 어떻게 선언하는가? |
| C++20 ranges | 지연 평가와 뷰의 수명을 어떻게 관리하는가? |
| C++20 `std::jthread` | 자동 join과 협력적 중단을 어떻게 설계하는가? |

`jthread`의 중단 요청은 실행 중인 함수를 강제로 종료하지 않는다. 작업이 중단 요청을 확인하고 빠져나오는 설계가 필요하다. 새 문법을 도입해도 객체 수명과 종료 책임을 먼저 생각하는 기준은 유지된다.

## 복습 체크리스트

- `auto`, `auto&`, `decltype(auto)`가 같은 초기값에서 어떤 타입을 만드는지 설명한다.
- `vector<int>(3, 10)`과 `vector<int>{3, 10}`의 차이를 확인한다.
- 동적 객체마다 누가 소유하고 언제 해제하는지 말할 수 있다.
- `std::move`를 붙였다는 이유만으로 이동 생성자가 호출된다고 단정하지 않는다.
- 일반적인 표준 라이브러리 객체의 이동 후 내용과 타입별 추가 보장을 구분한다.
- 전달 함수는 `std::forward`를 사용하고, 호출자 lvalue를 임의로 소비하지 않는다.
- 저장하는 람다마다 캡처 대상의 수명과 클로저의 복사 가능성을 확인한다.
- 비동기 작업에는 실행 정책, 예외 회수, 종료 책임을 적는다.
- 최적화 전후의 복사·이동 횟수와 실제 실행 시간을 측정한다.

## 참고 자료

### 초안 검증 기록

2026-10-19에 Visual Studio 2022의 MSVC로 장별 글의 C++ 코드 조각 54개를 `/std:c++14` 문법 검사했고, 템플릿을 실제로 인스턴스화하는 추가 검사 8개도 통과했다. PImpl의 헤더·구현과 앞 선언을 사용하는 호출부는 글에 표시한 문맥대로 함께 검사했다. 이는 컴파일 검증이며 모든 코드의 실행·동시성·성능 검증을 뜻하지 않는다.

8장에 Item 1–42가 각각 한 번씩 있는지, 목차 링크와 초안 상태가 일치하는지도 확인했다.

### 도서와 언어 규칙

- [Scott Meyers: 도서 소개와 정오표 링크](https://www.aristeia.com/books.html)
- [O'Reilly: Effective Modern C++ 공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)
- [저자의 관련 강의: 주제와 학습 목표](https://www.aristeia.com/EMC%2B%2B.html)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [C++ 작업 초안: auto](https://eel.is/c++draft/dcl.spec.auto)
- [C++ 작업 초안: move와 forward](https://eel.is/c++draft/forward)
- [C++ 작업 초안: 람다 캡처](https://eel.is/c++draft/expr.prim.lambda.capture)
- [C++ 작업 초안: async](https://eel.is/c++draft/futures.async)

작업 초안 링크는 계속 갱신되는 현재 규칙을 확인하는 보조 자료다. C++11/14 당시 규칙과 차이가 있는 부분은 사용하는 컴파일러의 표준 모드 및 결함 수정 적용 여부를 함께 확인한다.
