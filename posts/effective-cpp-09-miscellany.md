---
title: "Effective C++ 공부 09: 경고, 표준 라이브러리와 Boost"
description: "컴파일러 경고를 품질 도구로 사용하고, 과거 TR1 조언을 현대 표준 라이브러리로 업데이트하며, Boost를 도입할 때의 기준까지 시리즈를 마무리합니다."
date: "2026-10-06"
order: 9
category: "C++"
subcategory: "Effective C++"
tags: ["C++", "Effective C++", "Compiler Warnings", "Standard Library", "Boost"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: true
---

마지막 장은 특정 문법보다 학습과 검증의 습관을 다룬다. 컴파일러 경고를 무시하지 않고, 표준 라이브러리의 어휘를 익히며, 검증된 외부 라이브러리를 선별하는 습관은 책의 다른 52개 항목을 실제 프로젝트에서 유지하게 해 준다.

## 아이템 53: 컴파일러 경고에 주의를 기울이자

경고는 컴파일러가 증명하지 못한 의심스러운 코드를 알려 주는 정적 분석 결과다. 높은 경고 수준을 켜고 새 경고를 오류로 처리하면 결함이 코드베이스에 누적되는 것을 막을 수 있다.

```text
GCC / Clang: -Wall -Wextra -Wpedantic -Wconversion
MSVC:        /W4 /permissive-
```

모든 경고 옵션을 무작정 켜기보다 프로젝트에 의미 있는 집합을 정하고 CI와 로컬 빌드에서 동일하게 적용한다. 외부 라이브러리 경고는 system header나 별도 빌드 경계로 격리하고, 프로젝트 코드의 경고를 전체 비활성화하지 않는다.

경고를 억제해야 한다면 이유와 범위를 최소화한다. 캐스트를 추가해 경고만 없애기보다 값 범위와 변환 의도가 실제로 안전한지 확인한다. 서로 다른 컴파일러를 사용하면 한 도구가 놓친 문제를 다른 도구가 찾기도 한다.

## 아이템 54: TR1을 포함한 표준 라이브러리에 익숙해지자

3판의 TR1은 당시 차기 표준 후보 기능을 모은 라이브러리였다. 오늘날 `shared_ptr`, `function`, `bind`, 정규식, 난수, type traits 같은 많은 기능이 표준 라이브러리에 들어왔다. 따라서 현재의 핵심 교훈은 “TR1을 사용하라”가 아니라 “언어와 함께 배포되는 표준 어휘를 먼저 확인하라”다.

```cpp
std::optional<PlayerId> FindPlayer(std::string_view name);
std::span<const Entity> VisibleEntities() const;
std::expected<Packet, ParseError> ParsePacket(std::span<const std::byte> bytes);
```

`optional`, `span`, `string_view`, `variant`, `chrono`, ranges 같은 타입은 팀이 공통 의미를 공유하게 한다. 직접 만든 nullable wrapper나 시간 단위 정수보다 API 의도가 분명하고 다른 라이브러리와 조합하기 쉽다.

표준 타입도 수명 규칙을 알아야 한다. `string_view`와 `span`은 데이터를 소유하지 않으므로 원본보다 오래 살 수 없다. 표준이라는 이유만으로 비용과 계약을 읽지 않아도 되는 것은 아니다.

## 아이템 55: Boost에 익숙해지자

Boost는 표준화 전 아이디어가 검증되는 장소였고, 지금도 표준에 없는 네트워크·컨테이너·메타프로그래밍 기능을 제공한다. 하지만 “Boost이므로 사용”하거나 “헤더 전용이므로 무료”라고 판단해서는 안 된다.

도입 전에는 다음을 확인한다.

- 같은 기능이 현재 C++ 표준에 있는가?
- 필요한 하위 라이브러리만 사용할 수 있는가?
- 컴파일 시간과 바이너리 크기는 허용 가능한가?
- 플랫폼, 빌드 시스템, 라이선스 조건을 충족하는가?
- 프로젝트 수명 동안 업데이트할 책임을 질 수 있는가?

예를 들어 새 프로젝트에서 `boost::shared_ptr`보다 `std::shared_ptr`를 선택하는 것이 자연스럽다. 반면 표준에 대응 기능이 없고 요구 사항을 잘 충족하는 Boost.Asio 같은 라이브러리는 여전히 후보가 될 수 있다. 표준과 Boost의 버전 차이, API 안정성, 팀 경험을 함께 평가한다.

## 2005년의 조언을 현재 코드에 적용하는 방법

『Effective C++ 3판』의 근본 원칙은 여전히 유효하지만 도구는 달라졌다.

| 당시 주제 | 현대 C++에서 함께 볼 것 |
| --- | --- |
| 복사 금지 | `= delete`, move semantics |
| 직접 자원 관리 | Rule of Zero, `unique_ptr`, `make_unique` |
| `auto_ptr` 중심의 소유권 | `unique_ptr`, `shared_ptr`, `weak_ptr` |
| 태그 디스패치 | concepts, `if constexpr`, ranges |
| TR1 | C++11 이후 표준 라이브러리 |
| 수동 메모리 풀 | allocator, `std::pmr::memory_resource` |
| 헤더 의존성 | PImpl, modules, 빌드 캐시 |

오래된 예제를 최신 문법으로 바꾸는 것만으로는 충분하지 않다. 원래 항목이 해결하려던 문제가 무엇인지 먼저 적고, 현재 표준이 그 문제를 더 직접적으로 표현하는지 비교해야 한다.

## 시리즈를 마치며

55개 항목을 관통하는 원칙은 다음처럼 요약할 수 있다.

1. 소유권과 수명을 타입으로 표현한다.
2. 잘못된 사용은 컴파일 단계에서 막는다.
3. 인터페이스는 불변식과 대체 가능성을 드러낸다.
4. 예외와 실패 뒤에도 자원과 상태를 보존한다.
5. 추측보다 컴파일러, 테스트, 정적 분석과 프로파일러의 증거를 사용한다.
6. 오래된 조언은 문제의 본질을 보존하면서 최신 표준으로 번역한다.

이 책은 최신 C++ 기능 목록은 아니지만, 언어 기능을 설계 결정과 연결하는 훈련 자료로 가치가 있다. 각 항목을 절대 규칙으로 외우기보다 현재 프로젝트의 타입, 수명, 성능, 빌드 경계에 대입해 보는 것이 중요하다.

## 참고 자료

- [Effective C++ 3판 공식 목차](https://www.oreilly.com/library/view/effective-c-third/0321334876/)
- [Scott Meyers의 Effective 책 작성 원칙](https://scottmeyers.blogspot.com/2013/01/effective-effective-books.html)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Effective C++ 3판 한국어 항목 목록](https://www.ikpil.com/521)
