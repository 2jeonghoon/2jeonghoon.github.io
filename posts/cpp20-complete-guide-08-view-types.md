---
title: "08: 뷰 타입 자세히 보기"
description: "생성, 선택, 변환, 역순, 분할과 결합 뷰의 성질을 비교한다."
date: "2026-10-19"
order: 8
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Views", "Ranges"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

[공식 목차](https://leanpub.com/cpp20)와 [공개 저자 자료](https://www.cppstd20.com/code/toc.html)에서 순서를 가져와 표준 기능을 학습용으로 재구성했다. 비공개 본문을 요약한 글이 아니며 예제는 새로 썼다.

## 8.1 뷰를 역할로 분류하기

뷰는 원본을 감싸거나, 새 값을 생성하거나, 기존 범위를 변형해 보여 준다.
출력 원소의 소유자와 반복자의 능력이 종류마다 다르다.
`view`라는 이름만으로 연속성, 크기, const 순회, 다중 순회를 가정하지 않는다.

| 목적 | 대표 도구 | 먼저 확인할 성질 |
| --- | --- | --- |
| 외부 범위 감싸기 | `subrange`, `ref_view` | 원본 수명 |
| 값 생성 | `iota`, `single`, `empty` | 유한한가 |
| 원소 선택 | `take`, `drop`, `filter` | 크기와 순회 비용 |
| 원소 변환 | `transform`, `elements` | 참조인가 임시값인가 |
| 순서·경계 변경 | `reverse`, `split`, `join` | 필요한 반복자 능력 |

## 8.2 기반 클래스와 이름 공간

`view_interface`는 사용자 정의 뷰에 일부 편의 인터페이스를 제공한다.
상속했다고 유효한 시작과 끝, 올바른 수명이 저절로 구현되지는 않는다.
특정 연산은 필요한 조건이 있을 때만 제공된다.

`std::views`는 `std::ranges::views`의 별칭 이름 공간이다.
`filter_view` 같은 구체 타입과 `views::filter` 같은 어댑터 객체를 구분한다.
일반 사용자 코드는 어댑터를 통해 타입 추론과 합성을 이용하는 편이 간결하다.

## 8.3 외부 원소를 보는 소스 뷰

`subrange`는 반복자와 센티널을 범위 객체로 묶는다.
원소를 복사하지 않으며 필요하면 크기 정보도 보관한다.
`ref_view`는 기존 범위 객체를 참조하므로 원본 파괴와 반복자 무효화가 그대로 영향을 준다.

`owning_view`는 범위 객체 자체를 소유한다.
이는 초기 C++20 출판 사양 이후의 결함 수정 P2415R2와 관련된 확장이다.
수정이 반영된 라이브러리에서 rvalue 컨테이너를 파이프에 연결할 수 있는 범위가 넓어졌다.
이를 모든 초기 C++20 구현에서 보장된 기능처럼 설명하지 않는다.

`common_view`는 반복자·센티널 타입을 맞추는 호환 래퍼다.
원본이 가진 모든 성능 성질을 더 강하게 만드는 도구는 아니다.

## 8.4 값을 생성하는 뷰

`iota_view`는 시작 값에서 증가하며 값을 생성한다.
상한이 있으면 반열린 구간이며, 상한이 없으면 사실상 끝이 없는 범위가 된다.
정수 오버플로 전에 순회를 끝내는 것도 호출자의 책임이다.

`single_view`는 한 원소, `empty_view<T>`는 원소가 없는 범위를 표현한다.
값 하나도 범위 알고리즘에 연결할 수 있게 하는 작은 도구다.
`istream_view`는 입력 스트림에서 값을 읽으며 일반적으로 단일 통과다.
스트림 상태와 수명에 의존하므로 벡터처럼 여러 번 읽을 수 있다고 가정하지 않는다.

`string_view`와 `span`도 비소유 뷰 역할을 한다.
전자는 문자 시퀀스이고 널 종료를 보장하지 않으며, 후자는 연속 원소의 범위다.
둘 다 원소의 수명을 늘리지 않는다.

## 8.5 원소를 선택하는 뷰

`take(n)`은 앞에서 최대 n개, `drop(n)`은 앞의 n개를 제외한다.
`take_while`은 처음 조건이 거짓인 지점에서 멈춘다.
`drop_while`은 처음 조건이 거짓인 지점부터 나머지를 보여 준다.
`filter`는 전체 구간에서 조건을 만족하는 원소를 골라낸다.

따라서 중간에 조건이 거짓인 원소가 있는 데이터에서는 `take_while`과 `filter`가 다르다.
필터로 임의의 원소가 빠지면 원본의 임의 접근 능력은 보통 유지되지 않는다.
선택된 원소 개수를 알려면 실제로 검색해야 할 수 있다.

아래는 독립 실행 예제다.

```cpp
#include <cassert>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> values{2, 4, 1, 6};
    auto prefix = values | std::views::take_while([](int n) { return n % 2 == 0; });
    auto selected = values | std::views::filter([](int n) { return n % 2 == 0; });
    assert(std::ranges::distance(prefix) == 2);
    assert(std::ranges::distance(selected) == 3);
}
```

## 8.6 원소를 변환하는 뷰

`transform`은 역참조 시 함수를 적용한다.
함수가 값을 반환하면 결과는 저장된 원소에 대한 참조가 아닐 수 있다.
반환 참조가 임시 객체의 내부를 가리키지 않는지도 확인한다.

`elements<N>`는 tuple 형태 원소의 N번째 성분을 보여 준다.
`keys`와 `values`는 첫째·둘째 성분을 꺼내는 익숙한 이름이다.
맵의 키는 정렬 불변식을 지키기 위해 수정할 수 없고 값은 수정 가능할 수 있다.

## 8.7 순서를 뒤집는 뷰

`reverse_view`는 원소를 메모리에서 재배열하지 않고 역순으로 순회한다.
기반 범위에는 뒤로 갈 수 있는 능력이 필요하다.
`ranges::reverse` 알고리즘이 실제 원소를 교환하는 것과 구분한다.

## 8.8 여러 범위와 경계를 다루는 뷰

`split_view`는 구분 패턴으로 부분 범위들을 만든다.
`lazy_split_view`는 지연 분할의 성질과 입력 범위 지원 조건이 다르다.
이 이름 구분은 P2210R2 결함 수정으로 재설계된 split 계열과 관련 있다.
초기 C++20 구현과 수정 적용 구현의 결과 타입·능력이 다를 수 있다.

`join_view`는 범위들의 범위를 한 단계 평탄화한다.
문자열 목록을 연결해 순회할 수 있지만 원소 사이에 구분자를 삽입하지는 않는다.
C++23의 `join_with`나 `zip` 등은 이 장의 C++20 도구와 별개다.

## 복습 질문

1. `take_while`과 `filter`의 결과가 달라지는 가장 작은 입력은 무엇인가?
2. `reverse_view`를 만든 뒤 원본 벡터의 저장 순서는 바뀌는가?
3. 분할한 조각을 원본 문자열보다 오래 저장해도 되는가?
4. 변환 함수가 값과 참조 중 무엇을 반환하는지 어떻게 확인하는가?

[뷰 어댑터 규칙](https://eel.is/c++draft/range.adaptors)과 [P2415R2](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p2415r2.html), [P2210R2](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p2210r2.html)를 참고했다. 현재 초안의 모든 뷰가 C++20 기능인 것은 아니다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
