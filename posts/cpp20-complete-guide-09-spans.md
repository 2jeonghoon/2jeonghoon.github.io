---
title: "09: 스팬"
description: "연속 메모리를 빌리는 span의 크기, 수명, const와 부분 구간을 정리한다."
date: "2026-10-19"
order: 9
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "span", "Lifetime"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

[공식 목차](https://leanpub.com/cpp20)와 [저자 공개 자료](https://www.cppstd20.com/code/toc.html)를 바탕으로 주제를 고르고 표준 규칙으로 재구성한 공부 노트다. 비공개 본문을 읽은 요약은 아니며 예제는 새로 작성했다.

## 9.1 스팬 사용하기

`std::span<T>`는 연속된 원소를 포인터와 길이의 한 인터페이스로 묶는다.
메모리를 소유하지 않으므로 벡터나 배열을 복사하지 않고 함수에 전달하기 좋다.
포인터만 받던 API와 달리 길이를 함께 전달하지만 길이가 진실인지까지 증명하지는 않는다.

아래는 독립 실행 예제다.

```cpp
#include <array>
#include <cassert>
#include <span>
#include <vector>

int sum(std::span<const int> values) {
    int result = 0;
    for (int value : values) result += value;
    return result;
}

void double_each(std::span<int> values) {
    for (int& value : values) value *= 2;
}

int main() {
    std::array<int, 3> fixed{1, 2, 3};
    std::vector<int> dynamic{4, 5};
    assert(sum(fixed) == 6);
    assert(sum(dynamic) == 9);
    double_each(fixed);
    assert(fixed[2] == 6);
    std::span<int, 3> exactly_three{fixed};
    assert(exactly_three.size() == 3);
}
```

`span<int, 3>`의 길이는 타입에 포함된다.
`span<int>`는 `dynamic_extent`가 기본값이며 길이를 실행 중 보관한다.
고정 길이는 프로토콜 헤더나 좌표처럼 길이가 계약 일부인 경우에 유용하다.
길이가 다르면 같은 함수 특수화가 아니므로 인터페이스와 코드 생성에도 영향을 준다.

동적 스팬에서 고정 스팬을 만들 때는 명시적 생성과 길이 전제조건을 확인한다.
호출자가 잘못된 개수를 넣으면 타입 이름만으로 안전해지지 않는다.
배열에서 추론되는 고정 길이와 포인터·개수에서 전달되는 동적 길이를 구분한다.

## 9.2 스팬이 해롭다고 느껴지는 지점

이 절의 핵심 질문은 편리함이 어떤 안전 기대를 만들 수 있는가다.
스팬은 소유권, 수명 추적, 일반적인 런타임 경계 검사를 제공하지 않는다.
C++20의 `operator[]`는 인덱스가 범위 안에 있다는 전제조건을 가진다.

현재 초안에서 보이는 `span::at`와 강화된 계약 표현을 C++20에 소급하지 않는다.
사용자 입력 인덱스는 별도 검사가 필요하다.
포인터와 길이를 묶었다는 장점과 안전한 메모리 관리라는 다른 문제를 분리한다.

동적 길이를 받는 함수가 고정 길이를 필요로 하면 내부 전제조건을 문서화해야 한다.
빈 범위를 허용하지 않는 함수가 `front()`를 무조건 호출하면 스팬으로 바꿔도 결함은 남는다.
공개 API에서 무엇을 검사하고 무엇을 호출자에게 요구할지 정한다.

## 9.3 수명, 비용과 const 설계

스팬을 복사하면 원소가 아니라 빌린 구간 정보가 복사된다.
원본 배열이 파괴되거나 벡터가 재할당되면 복사한 스팬도 위험하다.
지역 벡터를 가리키는 스팬 반환은 지역 포인터 반환과 같은 수명 문제다.

스팬은 보통 작은 값으로 전달한다.
성능 이점은 큰 컨테이너 복사를 피하고 접근 패턴을 단순하게 한다는 데 있다.
정확한 크기와 코드 생성은 구현 및 최적화에 달려 있으므로 항상 두 워드라고 계약하지 않는다.

`const span<int>`는 래퍼의 const이며 원소 쓰기를 막지 않는다.
`span<const int>`가 읽기 전용 원소 인터페이스다.
함수 매개변수에서 의도를 표현할 때는 `const`가 붙은 위치를 먼저 확인한다.

다음은 선언과 호출 조각이다.

```cpp
template<class T>
void inspect(std::span<const T> values);

// std::vector<int> v{1, 2};
// inspect(v); // 템플릿 인수 추론은 사용자 정의 변환을 일반적으로 수행하지 않는다.
// inspect<int>(v); // T를 정하면 변환을 적용할 수 있다.
```

제네릭 함수의 인수 추론과 일반 함수의 암시적 변환을 혼동하면 호출이 예상과 달라진다.
필요하면 입력을 범위로 받고 내부에서 스팬을 만들거나 명시적 타입을 요구한다.
연속 메모리만 필요하다면 `contiguous_range`와 크기 조건으로 계약을 표현할 수도 있다.

## 9.4 스팬 연산 정리

`data`, `size`, `size_bytes`, `empty`로 구간 정보를 읽는다.
`size_bytes()`는 원소 수가 아니라 바이트 수다.
`front`, `back`, `operator[]`는 유효한 원소가 있다는 조건이 필요하다.
반복자는 연속 원소를 순회하며 스팬이 없어진 뒤에도 원본이 살아 있어야 한다.

배열, `std::array`, 조건을 만족하는 연속 범위, 포인터와 개수로 생성할 수 있다.
`std::list`는 연속 저장이 아니므로 스팬이 될 수 없다.
`vector<bool>`도 일반적인 bool 연속 배열처럼 취급할 수 없다.

`first`, `last`, `subspan`은 원소를 복사하지 않고 부분 구간을 만든다.
템플릿 인수 형태를 쓰면 고정 길이 정보가 결과 타입에 남을 수 있다.
실행 중 개수를 쓰는 형태는 동적 길이를 반환한다.
어느 형태든 요청한 부분 구간이 원본 안에 있어야 한다.

`as_bytes`와 `as_writable_bytes`는 객체 표현을 바이트 구간으로 본다.
이를 네트워크 직렬화 형식으로 그대로 쓰면 패딩, 바이트 순서, 객체 표현 문제가 남는다.
바이트 뷰를 얻는 일과 이식 가능한 파일 형식을 설계하는 일은 별개다.

## 9.5 복습과 선택 기준

1. 읽기 전용 함수에 `const span<int>`를 받으면 충분한가?
2. 원본 벡터의 `push_back` 뒤 기존 스팬이 유효한 조건은 무엇인가?
3. 함수가 정확히 네 원소를 요구한다면 어느 길이 표현이 더 명확한가?
4. 외부에서 받은 인덱스를 `operator[]`에 넣기 전에 누가 검사해야 하는가?

규칙은 [스팬 명세](https://eel.is/c++draft/views.span)로 확인했다. 현재 작업 초안의 `at`, 이후 추가 생성자 등은 C++20 예제에서 제외했다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
