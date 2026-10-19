---
title: "16: 모듈과 인터페이스 경계"
description: "모듈 인터페이스, 구현 단위, partition, 헤더 연동과 도달 가능성의 의미를 공부합니다."
date: "2026-10-19"
order: 16
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Modules", "Build"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 16.1 첫 모듈과 동기

헤더는 포함 지점에 텍스트로 들어와 매크로와 선언 환경의 영향을 받는다.
모듈은 이름 있는 인터페이스를 내보내고 의존 관계를 명시하는 언어 기능이다.
빌드 속도 개선 가능성뿐 아니라 공개 API와 내부 선언의 경계를 설계한다는 관점으로 접근한다.

아래 세 블록은 각각 별도 파일이다. 단일 소스 파일로 합쳐서 실행하는 예제가 아니다.
모듈 파일 확장자와 컴파일 옵션, 인터페이스 산출물 형식은 컴파일러마다 확인해야 한다.

```cpp
// ledger.cppm: 기본 모듈 인터페이스 단위
export module ledger;

export namespace ledger_api {
    int net(int income, int cost);
}
```

```cpp
// ledger.cpp: 모듈 구현 단위
module ledger;

namespace ledger_api {
    int net(int income, int cost) { return income - cost; }
}
```

```cpp
// app.cpp: 모듈 사용 번역 단위
import ledger;

int main() {
    return ledger_api::net(20, 20);
}
```

인터페이스를 먼저 처리하고 이를 사용하는 단위를 처리하는 의존 순서가 필요하다.
한 컴파일러가 만든 인터페이스 산출물을 다른 컴파일러에서 그대로 소비할 수 있다고 가정하지 않는다.
빌드 캐시는 컴파일러 버전과 관련 옵션 변화까지 추적해야 한다.

### 도달 가능성과 가시성

이름 검색으로 직접 찾을 수 있는 선언과, 컴파일 의미를 판단하는 데 필요한 선언은 구분된다.
내보낸 함수의 반환 타입이나 템플릿 구현에는 내부 선언이 필요할 수 있다.
그렇다고 사용자가 그 내부 이름을 직접 쓸 수 있게 내보내졌다는 뜻은 아니다.

모듈 이름은 네임스페이스를 자동으로 만들지 않는다.
예제의 `ledger_api`는 모듈 이름과 별도로 선언한 네임스페이스다.
기존 이름 충돌을 모듈 이름만으로 모두 해결하려 하지 않는다.

## 16.2 여러 파일로 나누기

기본 인터페이스 단위에는 `export module M;`을 사용한다.
구현 단위는 `module M;`으로 같은 모듈에 속한다.
partition은 `M:part`처럼 모듈 안을 나누는 이름이며 외부 사용자의 별도 공개 모듈 이름과 다르다.

```cpp
// ledger-types.cppm: 인터페이스 partition
export module ledger:types;
export struct Entry { int amount; };
```

```cpp
// partition을 사용하는 기본 인터페이스의 대안 조각
export module ledger;
export import :types;
export int total(Entry entry) { return entry.amount; }
```

이 두 블록은 앞의 ledger 예제와 함께 덧붙이는 파일이 아니라 대체 구성이다.
외부 사용자는 기본 인터페이스를 import하며, partition을 직접 외부 모듈처럼 import하지 않는다.
내부 partition은 공개하지 않을 구현 공유에 사용할 수 있다.

공개 partition을 만들었다면 기본 인터페이스에서 필요한 재수출 관계를 분명하게 구성한다.
단지 파일을 작게 나누려고 import 고리를 만들면 빌드 의존성이 복잡해진다.
인터페이스와 구현의 변경 빈도를 기준으로 나누는 편이 유용하다.

## 16.3 실제 빌드와 헤더 연동

기존 헤더를 포함할 때는 전역 모듈 조각을 사용할 수 있다.
`module;` 뒤의 전처리 지시문을 처리한 다음 이름 있는 모듈 선언을 둔다.
표준 라이브러리 헤더 전체를 아무 위치에나 include해도 동일하게 동작한다고 가정하지 않는다.

```cpp
// 독립적인 인터페이스 파일 예시
module;
#include <string>
export module greeting;

export std::string greet() { return "hello"; }
```

헤더 유닛 import와 이름 있는 모듈은 같은 기능이 아니다.
헤더 유닛에는 매크로와 관련된 별도 규칙이 있고, 헤더가 import 가능한지도 구현 환경에 의존한다.
C++20은 `import std;`를 표준 라이브러리의 일반 사용법으로 표준화한 버전이 아니다.

## 16.4 세부 설계

private module fragment는 `module :private;` 뒤에 비공개 구현을 두는 방식이다.
이 방식을 택한 모듈에는 단위 구성상 제약이 있으므로 여러 구현 단위를 자유롭게 섞는 대체 문법으로 생각하지 않는다.
공개 인터페이스 변경과 구현 변경을 어느 빌드 단계까지 전파할지도 도구와 함께 살핀다.

여러 하위 모듈을 묶는 우산 모듈은 `export import`로 인터페이스를 재수출할 수 있다.
일반 `import`와 재수출은 사용자가 얻는 API 범위가 다르다.
템플릿이나 인라인 정의가 필요로 하는 선언의 도달 가능성도 검토한다.

모듈 경계는 ABI 안정성을 자동 보장하는 장치가 아니다.
컴파일된 산출물과 배포 가능한 바이너리 인터페이스의 호환성을 구분한다.

## 16.5 복습 질문

- 모듈 이름과 namespace 이름이 각각 무엇을 구분하는가?
- 공개 partition을 어디에서 재수출하는가?
- 이름 검색에서 보이는 것과 의미 분석에 필요한 것이 어떻게 다른가?
- 인터페이스 캐시를 무효화해야 하는 변경은 무엇인가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 모듈](https://timsong-cpp.github.io/cppwp/n4861/module)
- [C++20 초안 N4861: 모듈 단위와 partition](https://timsong-cpp.github.io/cppwp/n4861/module.unit)
- [C++20 초안 N4861: import](https://timsong-cpp.github.io/cppwp/n4861/module.import)
