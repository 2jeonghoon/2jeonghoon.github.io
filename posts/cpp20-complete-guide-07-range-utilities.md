---
title: "07: 범위와 뷰를 위한 유틸리티"
description: "뷰 정규화, 센티널, 반복자 도구와 범위 알고리즘을 연결한다."
date: "2026-10-19"
order: 7
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Ranges", "Sentinel"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 [공식 목차](https://leanpub.com/cpp20)와 [저자 공개 자료](https://www.cppstd20.com/code/toc.html)에서 학습 경로를 얻고 표준 기능으로 재구성했다. 비공개 본문의 번역·요약은 아니며 예제는 새로 작성했다.

## 7.1 범위를 뷰로 다루는 핵심 도구

`views::all`은 입력 범위를 파이프가 다룰 수 있는 뷰 표현으로 정규화한다.
이미 뷰라면 그 뷰를 사용하고, 일반 lvalue 범위라면 대개 참조하는 뷰를 만든다.
rvalue 컨테이너 지원은 소유 뷰와 관련된 결함 수정의 적용 여부에 따라 차이가 있다.
따라서 C++20 초기 구현과 최신 라이브러리를 비교할 때는 이 차이를 함께 기록한다.

`views::counted`는 반복자와 원소 개수로 범위를 만든다.
연속 반복자에서는 `span`, 임의 접근에서는 다른 단순 범위 표현으로 최적화될 수 있다.
반환형 이름을 고정하기보다 필요한 범위 능력으로 사용한다.
개수가 실제 유효한 원소 수를 넘으면 센티널이 메모리 안전을 복구해 주지 않는다.

아래는 독립 실행 예제다.

```cpp
#include <cassert>
#include <iterator>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> values{10, 20, 30, 40};
    auto prefix = std::views::counted(values.begin(), 3);
    int sum = 0;
    for (int value : prefix) sum += value;
    assert(sum == 60);

    std::counted_iterator first{values.begin(), 2};
    int count = 0;
    for (; first != std::default_sentinel; ++first) ++count;
    assert(count == 2);
}
```

`views::common`은 시작과 끝 타입이 같아야 하는 기존 API와 연결한다.
이미 `common_range`라면 불필요한 변환을 피할 수 있다.
센티널의 장점을 포기하는 비용이 있을 수 있으므로 호환 경계에서만 적용한다.

## 7.2 새로운 반복자 분류 읽기

C++20은 연속 메모리 접근을 `contiguous_iterator`로 명확하게 표현한다.
`vector<int>::iterator`와 일반 포인터가 대표적인 예다.
임의 접근이라고 반드시 연속 메모리인 것은 아니다. `deque`를 구분해야 한다.

전통적인 `iterator_category`와 새 콘셉트의 분류가 항상 똑같이 보이지는 않는다.
프록시나 변환 뷰는 새 반복자 모델에서는 사용할 수 있어도 기존 알고리즘의 기대와 다를 수 있다.
사용자가 직접 반복자를 만들면 두 분류와 연산의 의미를 모두 확인한다.

## 7.3 반복자와 센티널 래퍼

`counted_iterator`는 남은 개수를 함께 보관하며 `default_sentinel`과 비교한다.
`common_iterator`는 반복자 또는 센티널을 한 타입에 담아 기존 코드와 연결한다.
`unreachable_sentinel`은 어떤 반복자와 비교해도 끝에 도달하지 않은 것으로 취급한다.
무한 생성 범위에는 자연스럽지만 실제 유한 버퍼의 경계 검사 대용으로 쓰면 안 된다.

`move_sentinel`은 이동 반복자와 짝을 이루는 끝 표현이다.
이동 반복자는 역참조 값의 범주를 이동에 적합하게 바꾼다.
실제 이동 발생 여부는 목적지 연산과 원소 타입에 달려 있다.
래퍼 이름만 보고 원본이 이미 비워졌다고 생각하지 않는다.

## 7.4 원소와 반복자를 다루는 함수

`ranges::begin`, `end`, `size`, `empty`, `data`는 제약과 사용자 정의 접근 규칙을 적용한다.
멤버 호출 하나로 단정하지 않고 배열이나 ADL 기반 범위도 같은 문맥에서 다룬다.
반환한 포인터와 반복자의 수명은 여전히 원본에 의존한다.

`ranges::advance`, `next`, `prev`, `distance`는 센티널과 개수 조건을 지원한다.
`distance`가 항상 상수 시간인 것은 아니다.
단일 통과 입력에서 거리를 알아내려고 한 번 순회하면 이후 읽기에 영향을 줄 수 있다.

`ranges::iter_move`와 `ranges::iter_swap`은 프록시 반복자의 사용자 정의를 수용한다.
제네릭 구현에서 무조건 `std::move(*it)`나 `swap(*a, *b)`로 고정하는 것보다 정확하다.
원소 교환과 반복자 변수 자체의 교환도 구분한다.

범위용 비교 함수 객체는 투명한 호출과 표준 비교 콘셉트를 고려한다.
같은 연산자 기호를 호출한다고 모든 사용자 타입에 대한 요구가 예전 함수 객체와 같지는 않다.

## 7.5 타입 계산 도구

`range_value_t<R>`는 원소 값 타입을, `range_reference_t<R>`는 역참조 결과 타입을 설명한다.
둘이 항상 `T`와 `T&`로 대응하지는 않는다.
`range_difference_t`, `iterator_t`, `sentinel_t`로 범위 구현의 타입을 직접 계산한다.

반복자 수준에서는 `iter_value_t`, `iter_reference_t`, `iter_rvalue_reference_t`를 사용한다.
프록시를 값처럼 저장해야 하는지 참조로 전달할지 판단할 때 중요한 구분이다.
`projected`는 projection을 적용한 뒤의 간접 호출 조건을 표현하는 데 쓰인다.

새 함수 객체와 타입 유틸리티는 이름을 외우기보다 입력과 출력의 관계로 정리한다.
내가 값 타입을 원하는지, 참조 표현식의 정확한 타입을 원하는지 먼저 적어 본다.

## 7.6 범위 알고리즘의 장점과 제한

범위 인수, projection, 제약, 구조체 형태 결과가 핵심 변화다.
`copy` 계열 결과에서 입력 끝과 출력 끝을 모두 얻는 식으로 후속 작업을 연결할 수 있다.
임시 소유 범위의 반환 반복자는 `dangling`으로 바뀔 수 있다.

검색·수정·분할·정렬·집합·힙 연산 등은 기존 알고리즘의 목적과 대응해서 공부한다.
하지만 C++20의 모든 수치 알고리즘이나 실행 정책에 범위 형태가 제공되지는 않는다.
기존 병렬 호출을 범위 호출로 기계적으로 치환하지 않는다.

## 복습 질문

1. `views::counted(ptr, n)`에서 누가 `n`개의 유효 원소를 보장하는가?
2. `random_access_iterator`와 `contiguous_iterator`의 차이는 무엇인가?
3. 프록시 반복자의 이동을 `iter_move`로 표현하는 이유는 무엇인가?
4. 단일 통과 범위에서 `distance`를 먼저 계산하는 설계가 안전한가?

규칙은 [범위 유틸리티](https://eel.is/c++draft/range.utility)와 [범위 어댑터](https://eel.is/c++draft/range.adaptors)로 대조했다. 링크는 최신 작업 초안이다. 소유 뷰 관련 결함 수정과 C++23 이후 알고리즘 추가를 C++20 최초 사양과 혼동하지 않는다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
