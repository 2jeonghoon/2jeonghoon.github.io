---
title: "03: 현대 C++로 옮겨가기"
description: "Item 7–17. 초기화, 인터페이스, 예외 계약과 특수 멤버 함수의 기준을 정리합니다."
date: "2026-10-27"
order: 3
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++","Effective Modern C++","초기화","인터페이스"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 3장, Item 7–17을 따라 작성한 개인 학습 노트다. 공개 목차와 언어 참조를 연결했으며 책 전체 본문의 번역이 아니다. 예제는 C++11/14의 독립적인 선언·함수 조각이고 실행하려면 필요한 호출부를 별도로 구성한다.

## Item 7. 괄호와 중괄호의 생성자 선택을 구별하기

```cpp
#include <vector>
std::vector<int> repeated(4, 2); // 2 네 개
std::vector<int> listed{4, 2};   // 4와 2
// int bad{2.7};                // 축소 변환 오류
```

중괄호는 축소 변환을 막고 가장 성가신 해석 문제를 피하지만 initializer_list 생성자를 우선 고려한다. 괄호를 중괄호로 바꾸는 리팩터링은 동작을 바꿀 수 있다. 특히 원소 목록과 크기·초기값을 구별한다. [목록 초기화](https://eel.is/c++draft/dcl.init.list)

## Item 8. 널 포인터는 nullptr로 표현하기

```cpp
void select(int) {}
void select(void*) {}
void example() { select(nullptr); } // 포인터 오버로드
```

0이나 NULL은 정수 타입으로 처리되어 오버로드와 템플릿 전달에서 의도를 잃을 수 있다. nullptr는 고유 타입 std::nullptr_t를 가져 포인터 의도를 보존한다. 여러 포인터 오버로드가 있다면 nullptr만으로 선택할 수 없어 명확한 타입이 필요할 수 있다.

## Item 9. typedef보다 별칭 선언 검토하기

```cpp
#include <memory>
#include <vector>
template<class T>
using Owners = std::vector<std::unique_ptr<T>>;
Owners<int> numbers;
```

using은 템플릿 별칭을 직접 표현한다. 별칭 자체는 새 타입을 만들지 않으므로 단위나 의미가 다른 값을 구별하는 장치는 아니다. 종속 타입을 감싼 구조체를 만들 필요가 줄지만, 일반적인 종속 이름에는 여전히 typename이 필요할 수 있다. [타입 별칭 명세](https://eel.is/c++draft/dcl.typedef)

## Item 10. 범위 있는 열거형을 우선 검토하기

```cpp
enum class DownloadState { Waiting, Active, Done };
DownloadState state = DownloadState::Waiting;
```

enum class는 열거자 이름을 범위 안에 두고 정수로의 암시적 변환을 제한한다. 정수로 저장하거나 외부 API에 전달할 때는 명시적 변환을 사용한다. 비트 플래그 연산도 자동 지원되지 않아 필요한 연산을 설계해야 한다. [열거형 명세](https://eel.is/c++draft/dcl.enum)

## Item 11. 사용할 수 없는 함수는 delete로 드러내기

```cpp
bool isOdd(int value) { return value % 2 != 0; }
bool isOdd(double) = delete;
// isOdd(3.5); // 의도하지 않은 변환을 차단
```

삭제된 함수도 오버로드 후보에 참여한다. 가장 잘 맞는 함수가 삭제되었다면 호출은 실패하므로 원치 않는 변환을 정확히 막을 수 있다. private 미정의 함수와 달리 일반 함수에도 쓸 수 있고 의도가 선언에 보인다. 금지할 타입 집합을 충분히 검토해야 한다. [삭제된 정의](https://eel.is/c++draft/dcl.fct.def.delete)

## Item 12. 재정의에는 override 붙이기

```cpp
struct View {
    virtual ~View() = default;
    virtual int size() const { return 0; }
};
struct ListView : View {
    int size() const override { return 3; }
};
```

const, 매개변수 타입, 참조 한정자가 다르면 의도한 재정의가 아닐 수 있다. override는 이 실수를 컴파일러 진단으로 바꾼다. 이름이 같다는 사실만으로 재정의가 되는 것은 아니다. 참조 한정자를 활용한다면 lvalue와 rvalue 객체의 호출 의도도 함께 정한다. [가상 함수](https://eel.is/c++draft/class.virtual)

## Item 13. 변경하지 않을 반복에는 const_iterator 활용하기

```cpp
#include <algorithm>
#include <vector>
void insertBefore() {
    std::vector<int> values{1, 5};
    auto where = std::find(values.cbegin(), values.cend(), 5);
    values.insert(where, 3);
}
```

C++11 컨테이너의 위치 지정 삽입 등은 const_iterator를 받는다. 탐색 단계에서 원소를 수정하지 않는 의도를 유지할 수 있다. 다만 const_iterator는 컨테이너의 다른 코드가 원소를 변경하거나 재할당하는 것을 막지 않는다. 무효화 규칙은 별도다. [반복자 범위 접근](https://eel.is/c++draft/iterator.range)

## Item 14. 예외를 내보내지 않는 계약은 noexcept로 표현하기

```cpp
#include <utility>
template<class T>
void swapValues(T& left, T& right)
    noexcept(noexcept(std::swap(left, right))) {
    std::swap(left, right);
}
```

조건부 noexcept는 내부 연산의 계약을 전달한다. 이동 연산의 예외 가능성은 컨테이너 재배치 전략에 영향을 줄 수 있다. 그러나 성능을 위해 거짓 계약을 붙이면 예외가 빠져나올 때 terminate가 호출된다. noexcept 식은 예외가 실제로 발생할지 예측하는 실행 검사가 아니다. [예외 명세](https://eel.is/c++draft/except.spec)

## Item 15. 상수 평가가 가능한 계산에 constexpr 활용하기

```cpp
constexpr int cube(int value) { return value * value * value; }
constexpr int fixed = cube(3);
int runtimeCube(int input) { return cube(input); }
```

constexpr 함수는 상수 평가 가능한 호출을 지원하지만 모든 호출을 컴파일 시간에 실행하도록 강제하지 않는다. C++11은 함수 본문에 강한 제약이 있고 C++14는 지역 변수와 반복문 등으로 완화된다. 입력 범위와 정수 오버플로도 상수 평가의 제약에 영향을 준다. [constexpr 명세](https://eel.is/c++draft/dcl.constexpr)

## Item 16. const 멤버 함수의 내부 변경도 동기화하기

```cpp
#include <mutex>
class Counter {
    mutable std::mutex mutex_;
    mutable int reads_ = 0;
public:
    int readCount() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return ++reads_;
    }
};
```

const는 같은 객체에 대한 동시 호출의 안전성을 보장하지 않는다. mutable 캐시나 통계가 있으면 데이터 경쟁이 생길 수 있다. 단일 독립 카운터에는 atomic이 적절할 수 있지만 여러 값의 불변식에는 mutex가 더 자연스럽다. 동기화 비용보다 먼저 공유 상태의 범위를 줄인다.

## Item 17. 특수 멤버 함수의 자동 생성을 추측하지 않기

```cpp
#include <memory>
struct Buffer {
    std::unique_ptr<int> data;
    Buffer() = default;
    Buffer(Buffer&&) = default;
    Buffer& operator=(Buffer&&) = default;
    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;
};
```

사용자 선언 소멸자는 암시적 이동 연산 생성을 막을 수 있다. 삭제한 복사 함수도 사용자 선언이므로 영향이 있다. 이동을 선언했다고 모든 멤버가 이동 가능한 것도 아니다. default 정의가 멤버 조건 때문에 삭제될 수 있다. 기본값으로 충분하면 소멸자까지 생략하는 Rule of Zero부터 검토한다. [복사·이동 생성자](https://eel.is/c++draft/class.copy.ctor)

## 복습 메모와 참고

- 생성자 문법 변경은 선택되는 오버로드부터 비교한다.
- 삭제·재정의·예외 계약은 컴파일러가 검증할 수 있게 표현한다.
- const와 constexpr의 목적을 동시성 보장과 혼동하지 않는다.
- 자원 소유 멤버를 바꾸면 복사·이동 가능성도 다시 확인한다.

[저자의 범위 안내](https://www.aristeia.com/EMC%2B%2B.html)와 현재 작업 초안은 역할이 다르다. 초안의 이후 기능은 이 장의 C++11/14 예제에 자동으로 적용하지 않는다.

[이전: auto](/?post=effective-modern-cpp-02-auto) · [개요](/?post=effective-modern-cpp-overview) · [다음: 스마트 포인터](/?post=effective-modern-cpp-04-smart-pointers)
