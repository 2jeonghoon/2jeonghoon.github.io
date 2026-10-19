---
title: "23: 표준 라이브러리의 작은 개선"
description: "문자열, source_location, 안전한 정수 비교, 비트 도구와 알고리즘 확장을 공부합니다."
date: "2026-10-19"
order: 23
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Standard Library", "Bits", "source_location"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 23.1 문자열의 접두·접미 검사와 reserve

`starts_with()`와 `ends_with()`는 위치 계산을 직접 작성하는 수고를 줄인다.
`string`과 `string_view`에서 사용할 수 있고, 검색 실패 값과 인덱스를 섞는 실수를 피하기 쉽다.
대소문자 무시나 Unicode 정규화까지 처리하는 함수는 아니다.

```cpp
#include <string>
#include <string_view>
#include <cassert>

int main() {
    constexpr std::string_view path = "reports/2026.csv";
    static_assert(path.starts_with("reports/"));
    static_assert(path.ends_with(".csv"));
    std::string buffer;
    buffer.reserve(256);
    auto capacity = buffer.capacity();
    buffer.reserve(32); // 축소를 요청하는 용도로 쓰지 않는다.
    assert(buffer.capacity() == capacity);
}
```

C++20의 인자 있는 `reserve()`는 더 작은 용량을 요청해 저장소를 줄이는 수단이 아니다.
축소는 `shrink_to_fit()` 같은 별도 의도를 사용하되, 실제 축소가 강제된다고 보장하지 않는다.
용량 확보가 끝난 뒤에도 재할당을 일으키는 변경은 기존 포인터·뷰에 영향을 줄 수 있다.

## 23.2 source_location과 호출 위치

파일명과 줄 번호를 기본 인자로 수집하면 호출 지점을 전달하는 로깅 인터페이스를 만들 수 있다.
함수 본문 안에서 직접 `current()`를 호출하는 것과 기본 인자에서 호출하는 것은 위치가 다르다.
위치를 래퍼 함수에서 누락하면 최종 사용자 호출부 대신 래퍼 위치가 남을 수 있다.

```cpp
#include <iostream>
#include <source_location>
#include <string_view>

void log(std::string_view text,
         std::source_location at = std::source_location::current()) {
    std::cout << at.file_name() << ':' << at.line() << ' ' << text << '\n';
}
int main() { log("loaded"); }
```

이 정보는 진단용이며 파일 경로나 함수명 표현의 세부 형식에 업무 로직을 의존시키지 않는다.
빌드 경로가 외부 로그에 노출되어도 괜찮은지는 배포 환경에서 판단한다.
성능이 중요한 로그는 위치 수집과 실제 문자열 출력 비용을 나누어 측정한다.

## 23.3 정수와 크기의 안전한 비교

음수 정수를 unsigned 크기와 비교하면 일반 산술 변환 때문에 예상 밖 결과가 생길 수 있다.
`std::cmp_less`, `cmp_equal` 등은 부호 차이를 고려한 비교를 제공한다.
`std::in_range<T>()`는 값을 T로 표현할 수 있는지 검사한다.

```cpp
#include <utility>
#include <iterator>
#include <vector>
#include <cassert>

int main() {
    std::vector<int> values{1, 2, 3};
    int index = -1;
    assert(std::cmp_less(index, values.size()));
    assert(!std::in_range<unsigned>(index));
    auto signed_size = std::ssize(values);
    assert(signed_size == 3);
    bool valid = index >= 0 && std::cmp_less(index, values.size());
    assert(!valid);
}
```

안전한 수치 비교도 음수 인덱스의 유효성을 자동 보장하지 않는다.
`ssize()`는 부호 있는 크기를 얻는 도구이고, 비어 있는 범위에서 size-1을 바로 인덱스로 써도 된다는 뜻이 아니다.
값의 범위와 컨테이너 경계를 각각 검사한다.

## 23.4 수학 상수

`<numbers>`는 `std::numbers::pi`와 `pi_v<T>` 같은 상수를 제공한다.
임의의 매크로 이름이나 직접 적은 짧은 소수보다 타입과 의도를 분명히 할 수 있다.
단위가 라디안인지 도인지, 계산 타입이 무엇인지도 함께 정한다.

코드 조각: `constexpr double circle = 2.0 * std::numbers::pi * radius;`
이 식에는 `<numbers>`와 상수 식으로 사용할 수 있는 `radius` 선언이 필요하다.
상수를 표준화해도 계산 전체의 수치 안정성까지 자동 해결되지는 않는다.

## 23.5 비트 도구와 bit_cast

`<bit>`의 `popcount`, `countl_zero`, `countr_zero`, `rotl`, `rotr` 등을 사용하면 비트 반복문을 줄일 수 있다.
많은 비트 연산은 부호 없는 정수 타입을 요구하므로 입력 타입을 명확히 한다.
`bit_ceil`은 결과가 타입에 표현 가능한지 전제 조건을 확인한다.

```cpp
#include <bit>
#include <cstdint>

static_assert(std::popcount(0b101101u) == 4);
static_assert(std::rotl(1u, 3) == 8u);
static_assert(std::bit_ceil(9u) == 16u);
static_assert(sizeof(float) == sizeof(std::uint32_t));
// 비트 패턴의 수치값은 부동소수점 표현에 의존하므로 단정하지 않는다.
auto bits = std::bit_cast<std::uint32_t>(1.0f);
int main() {}
```

`bit_cast`는 크기가 같고 trivially copyable인 타입 등 요구 조건 아래에서 표현을 복사한다.
유효하지 않은 목적 표현이나 padding 등의 규칙까지 무시하는 재해석 장치가 아니다.
`std::endian`은 실행 환경의 바이트 순서를 드러내지만 네트워크 포맷 변환을 자동으로 수행하지 않는다.

## 23.6 version과 23.7 알고리즘 확장

`<version>`에서 라이브러리 기능 검사 매크로를 확인할 수 있다.
컴파일러와 표준 라이브러리의 지원을 분리해 확인할 때 유용하다.
해당 기능의 선언을 쓰려면 그 기능의 헤더도 포함한다.

range 알고리즘과 projection은 컨테이너 전체와 멤버 기준 연산을 더 직접 표현한다.
`shift_left`·`shift_right`는 구간 안에서 원소를 이동하지만 컨테이너 크기를 줄이지 않는다.
이동 후 남은 원소의 상태와 반환 iterator의 의미를 이해하고 후속 처리를 해야 한다.

`execution::unseq`는 벡터화 등 순서 없는 실행을 허용한다.
호출 순서나 공유 상태에 의존하는 callable을 넘기면 위험하다.
일반 순차 코드에 실행 정책만 붙인다고 올바른 병렬·벡터화 코드가 되는 것은 아니다.

## 23.8 복습 질문

- source_location이 사용자 호출부를 기록하도록 기본 인자를 어디에 두는가?
- 부호 안전 비교와 인덱스 유효성 검사를 구별하는가?
- 비트 함수의 입력 타입과 결과 표현 범위를 확인했는가?
- shift 알고리즘이 컨테이너 크기까지 바꾼다고 생각하지 않는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: source_location](https://timsong-cpp.github.io/cppwp/n4861/support.srcloc)
- [C++20 초안 N4861: 정수 비교](https://timsong-cpp.github.io/cppwp/n4861/utility.intcmp)
- [C++20 초안 N4861: 비트 처리](https://timsong-cpp.github.io/cppwp/n4861/bit)
- [C++20 초안 N4861: 알고리즘](https://timsong-cpp.github.io/cppwp/n4861/algorithms)
