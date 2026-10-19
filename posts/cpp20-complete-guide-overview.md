---
title: "C++20 — The Complete Guide: 학습 안내와 전체 목차"
description: "Effective Modern C++ 다음으로 공부하는 C++20. Nicolai M. Josuttis의 책 실제 24장 목차를 따라 새 언어 기능과 라이브러리의 사용법, 수명, 제약을 정리합니다."
date: "2026-10-19"
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "The Complete Guide", "학습 목차"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

## 공부할 책과 순서

기준 도서는 **Nicolai M. Josuttis의 『C++20 — The Complete Guide』**다. 이미 이전 버전의 C++를 아는 독자가 C++20에 추가된 언어·라이브러리 기능을 배우는 책이다. [공식 소개](https://www.cppstd20.com/cppstd20.html)와 [저자 판매 페이지의 실제 목차](https://leanpub.com/cpp20)를 기준으로 학습 범위를 정했다.

개인 학습 순서는 다음과 같다.

1. [Effective Modern C++ 공부 노트](/?post=effective-modern-cpp-overview)로 타입 추론, 객체 수명, 소유권, 이동, 전달, 람다, 기본 동시성의 판단 기준을 공부한다.
2. 이 책을 **실제 1장부터 24장 순서**로 공부한다.
3. 예제를 바꾸어 보고, 필요한 기능을 작은 코드에 적용한다. 기능을 사용했다는 사실보다 수명과 실패 경로를 설명할 수 있는지 확인한다.

두 책 사이에서 C++17 기능을 만나면 필요한 부분을 보충한다. 특히 구조적 바인딩, `if constexpr`, `std::string_view`, 클래스 템플릿 인수 추론(CTAD)을 익혀 두면 좋다. 이 시리즈에서는 C++17의 기능을 C++20의 신기능으로 분류하지 않는다.

## 정리 방식과 자료의 범위

이 시리즈는 **공개 목차를 따라 작성한 독립적인 학습 초안**이다. 책 전체 본문을 확보해 완독한 기록이나 장별 번역은 아니다. 공개 목차로 장과 주요 절의 순서를 확인하고, 저자가 공개한 자료와 언어·라이브러리 규칙을 대조해 설명과 예제를 구성한다. 모든 세부 절과 예외 규칙을 빠짐없이 재현한 것은 아니다.

장마다 주제의 목적, 핵심 규칙, 짧은 예제, 실수하기 쉬운 조건, 복습 질문을 정리한다. 예제는 별도 표시가 없다면 노트를 위해 작성한 것이며, 조각 코드와 독립 실행 프로그램을 구분한다. 책 원문의 예제를 그대로 재수록하지 않는다.

현재 표준 작업 초안은 C++20 이후의 변경도 포함하므로, 그 링크는 규칙을 확인하는 보조 자료로 사용한다. C++23 이상의 기능은 C++20 예제로 섞지 않는다. 예를 들어 `std::generator`, `std::print`, `std::expected`, `std::ranges::to`, 표준 라이브러리 모듈의 `import std;`를 C++20 기본 제공 기능으로 가정하지 않는다.

## 장별 공부 노트

아래 장 번호는 저자 판매 페이지의 공개 목차 기준이다. 저자 홈페이지의 주제 소개 순서와 구분한다. 서문·책 사용 안내는 이 글에서 다루고, 본문 24장을 별도 글로 정리한다. 용어집은 독립적인 학습 장으로 세지 않는다.

초안은 공개 글 목록에서 제외되므로 아래 링크가 공개 사이트에서 아직 열리지 않을 수 있다. 저장소 또는 관리자 편집 화면에서 확인한다.

| 장 | 공부 노트 |
| --- | --- |
| 1 | [비교와 삼방향 비교 연산자](/?post=cpp20-complete-guide-01-comparisons) |
| 2 | [함수 매개변수의 auto](/?post=cpp20-complete-guide-02-placeholder-parameters) |
| 3 | [concepts·요구 사항·제약](/?post=cpp20-complete-guide-03-concepts) |
| 4 | [제약과 requires의 상세 규칙](/?post=cpp20-complete-guide-04-constraints-details) |
| 5 | [표준 concepts](/?post=cpp20-complete-guide-05-standard-concepts) |
| 6 | [ranges와 views](/?post=cpp20-complete-guide-06-ranges-views) |
| 7 | [range 유틸리티](/?post=cpp20-complete-guide-07-range-utilities) |
| 8 | [view 종류와 선택](/?post=cpp20-complete-guide-08-view-types) |
| 9 | [span](/?post=cpp20-complete-guide-09-spans) |
| 10 | [서식 있는 출력](/?post=cpp20-complete-guide-10-formatted-output) |
| 11 | [날짜와 시간대](/?post=cpp20-complete-guide-11-chrono) |
| 12 | [jthread와 중단 토큰](/?post=cpp20-complete-guide-12-jthread-stop-tokens) |
| 13 | [동시성 기능](/?post=cpp20-complete-guide-13-concurrency) |
| 14 | [코루틴](/?post=cpp20-complete-guide-14-coroutines) |
| 15 | [코루틴 상세 규칙](/?post=cpp20-complete-guide-15-coroutines-detail) |
| 16 | [모듈](/?post=cpp20-complete-guide-16-modules) |
| 17 | [람다 확장](/?post=cpp20-complete-guide-17-lambda-extensions) |
| 18 | [컴파일 시간 계산](/?post=cpp20-complete-guide-18-compile-time) |
| 19 | [비타입 템플릿 매개변수 확장](/?post=cpp20-complete-guide-19-nttp) |
| 20 | [새로운 타입 특성](/?post=cpp20-complete-guide-20-type-traits) |
| 21 | [핵심 언어의 작은 개선](/?post=cpp20-complete-guide-21-core-language) |
| 22 | [일반화 프로그래밍의 작은 개선](/?post=cpp20-complete-guide-22-generic-programming) |
| 23 | [표준 라이브러리의 작은 개선](/?post=cpp20-complete-guide-23-library) |
| 24 | [사용 중단과 제거된 기능](/?post=cpp20-complete-guide-24-deprecated-removed) |

## 공부하면서 확인할 것

- **타입 요구 사항:** 어떤 타입이 허용되고, 문법 검사로 확인할 수 없는 의미적 계약은 무엇인가?
- **수명과 소유권:** view, span, 람다, 코루틴이 원본을 참조하는가? 원본은 언제 파괴되는가?
- **실행 시점:** 컴파일 시간 평가, 지연 평가, 실제 병렬 실행을 구분할 수 있는가?
- **비용과 실패:** 복사·이동·할당·블로킹·예외는 어느 지점에서 생기는가?
- **도구 지원:** 컴파일러 옵션과 표준 라이브러리 구현이 모두 해당 기능을 지원하는가?

C++20 표준 모드를 켠 것과 모든 라이브러리 기능이 준비된 것은 다르다. 컴파일러·라이브러리 버전과 기능 테스트 매크로를 함께 확인한다. 모듈은 의존성 스캔과 빌드 순서까지 따로 검증한다.

## 실습 방법

각 장에서 먼저 최소 예제를 실행한 다음 한 가지 조건만 바꾼다. 예를 들어 span에서는 원본 vector를 재할당해 보고, ranges에서는 같은 파이프라인을 두 번 순회해 보고, jthread에서는 작업이 중단 토큰을 확인하지 않을 때를 생각해 본다. 의도적으로 잘못된 수명에 접근하는 프로그램을 실행하기보다 안전한 예제와 규칙으로 원인을 설명한다.

기록은 **예상한 동작 → 컴파일 결과 또는 출력 → 이유 → 적용 조건** 순서로 남긴다. 컴파일이 통과한 예제와 성능을 측정한 예제를 구별한다. 벤치마크하지 않은 코드를 빠르다고 단정하지 않는다.

## 참고 자료

### 초안 검증 기록

2026-10-19에 Visual Studio 2022의 MSVC로 장별 글에 있는 독립 프로그램 49개를 `/std:c++20`으로 컴파일하고 실행했다. 예제 안의 `assert`와 `static_assert`도 통과했다. 16장의 첫 모듈 예제는 인터페이스·구현·사용 파일을 분리하여 별도로 빌드하고 실행했다. 시간대 예제는 검증 환경의 시간대 데이터를 사용했다.

설명용 선언 조각과 대체 모듈 구성까지 모두 실행 검증했다는 뜻은 아니다. 다른 컴파일러의 지원, 데이터 경쟁, 성능, 모든 입력의 안전성은 별도 검증 대상이다.

본문 24장의 번호·순서, 각 글의 분류와 초안 상태, 내부 목차 링크를 확인했다. 저장소의 블로그 검사 131개와 빌드도 통과했다. 두 책의 장별 글 32편과 안내 2편은 모두 `draft: true`로 공개 글 목록에서 제외된다.

### 도서와 언어 규칙

- [도서 공식 소개](https://www.cppstd20.com/cppstd20.html)
- [Leanpub: 실제 장·절 목차](https://leanpub.com/cpp20)
- [저자 공개 예제 목록](https://www.cppstd20.com/code/toc.html)
- [저자 정오표](https://cppstd20.com/errata.html)
- [C++20 작업 초안 N4861](https://timsong-cpp.github.io/cppwp/n4861/)
