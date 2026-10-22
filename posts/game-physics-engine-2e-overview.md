---
title: "Game Physics Engine Development 2판: 학습 안내와 전체 목차"
description: "Ian Millington의 책 목차를 따라 입자, 질점 집합, 강체, 충돌 검출, 충돌 해결과 마찰을 공부합니다."
date: "2026-10-19"
category: "Game Development"
subcategory: "Game Physics Engine Development"
tags: ["Game Physics", "Physics Engine", "Ian Millington", "학습 목차"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

## 기준 도서와 목표

기준 도서는 **Ian Millington의 『Game Physics Engine Development』 2판(2010)**이다. 작은 입자 모델에서 출발해 힘, 제약, 회전, 강체, 충돌과 마찰을 연결하는 구현 중심의 공부에 사용한다. [출판사 소개와 목차](https://www.routledge.com/Game-Physics-Engine-Development-How-to-Build-a-Robust-Commercial-Grade/Millington/p/book/9780429099441)와 [저자의 Cyclone 코드](https://github.com/idmillington/cyclone-physics)를 함께 참고한다.

이 책의 엔진은 원리와 구조를 배우는 학습 기준이다. 현재의 상용 엔진이나 Unreal의 물리 시스템과 구현·기능이 같다고 가정하지 않는다. 현대 엔진의 문서를 보충 자료로 사용할 때도 책의 구현과 별도로 표시한다.

## 실제 목차대로 공부하기

장 번호는 [2판의 공개 목차](https://www.oreilly.com/library/view/game-physics-engine/9780123819765/) 기준이다. 서론도 본문의 1장이므로 입자 수학은 2장부터 시작한다. 파트 구분을 보존하고, 부록 A–C는 하나의 참고 글 안에서 원래 순서대로 묶었다.

| 파트 | 장 | 공부 노트 |
| --- | --- | --- |
| 서론 | 1 | [게임 물리와 엔진의 구성](/?post=game-physics-engine-2e-01-introduction) |
| I. 입자 물리 | 2 | [입자를 위한 수학](/?post=game-physics-engine-2e-02-mathematics-for-particles) |
| I | 3 | [운동 법칙과 적분](/?post=game-physics-engine-2e-03-laws-of-motion) |
| I | 4 | [입자 물리 엔진](/?post=game-physics-engine-2e-04-particle-physics-engine) |
| II. 질점 집합 | 5 | [일반적인 힘](/?post=game-physics-engine-2e-05-adding-general-forces) |
| II | 6 | [스프링과 유사한 힘](/?post=game-physics-engine-2e-06-springs-and-springlike-things) |
| II | 7 | [강제약](/?post=game-physics-engine-2e-07-hard-constraints) |
| II | 8 | [질점 집합 물리 엔진](/?post=game-physics-engine-2e-08-mass-aggregate-physics-engine) |
| III. 강체 | 9 | [회전을 위한 수학](/?post=game-physics-engine-2e-09-mathematics-for-rotations) |
| III | 10 | [강체 운동 법칙](/?post=game-physics-engine-2e-10-laws-of-motion-for-rigid-bodies) |
| III | 11 | [강체 물리 엔진](/?post=game-physics-engine-2e-11-rigid-body-engine) |
| IV. 충돌 검출 | 12 | [충돌 검출과 후보 줄이기](/?post=game-physics-engine-2e-12-collision-detection) |
| IV | 13 | [접촉 생성](/?post=game-physics-engine-2e-13-generating-contacts) |
| V. 접촉 물리 | 14 | [충돌 해결](/?post=game-physics-engine-2e-14-collision-resolution) |
| V | 15 | [정지 접촉과 마찰](/?post=game-physics-engine-2e-15-resting-contacts-friction) |
| V | 16 | [안정성과 최적화](/?post=game-physics-engine-2e-16-stability-optimization) |
| V | 17 | [전체 엔진으로 통합](/?post=game-physics-engine-2e-17-putting-it-all-together) |
| VI. 추가 주제 | 18 | [2차원 물리](/?post=game-physics-engine-2e-18-physics-in-2d) |
| VI | 19 | [다른 프로그래밍 언어](/?post=game-physics-engine-2e-19-other-languages) |
| VI | 20 | [다른 물리 접근법](/?post=game-physics-engine-2e-20-other-physics) |
| 부록 | A–C | [관성·마찰·수학 참고](/?post=game-physics-engine-2e-appendices) |

초안은 공개 글 목록에서 제외되므로 저장소 또는 관리자 편집 화면에서 확인한다. 각 장의 요약·연습은 직접 만든 복습 자료이며 책의 연습문제와 해답을 재수록한 것이 아니다.

## 필요한 수학과 표기

[선형대수학 노트](/?post=linear-algebra-6e-overview)의 벡터·행렬·내적·투영을 먼저 익히면 입자 운동과 접촉을 이해하기 쉽다. 회전과 관성에는 선형변환과 고유 방향도 연결된다. 미분은 순간 변화율, 적분은 시간에 따른 누적으로 읽는 기초부터 설명한다.

원본 책의 코드를 설명하는 부분과 노트의 독립적인 예제를 구분한다. 노트 예제의 기본 약속은 다음과 같고, 장에서 다른 약속을 사용하면 그곳에 명시한다.

- 길이 m, 시간 s, 질량 kg의 SI 단위를 사용한다.
- 행렬은 열벡터에 왼쪽에서 곱한다. 3차원 예제는 별도 언급이 없으면 오른손 좌표계다.
- 힘 N과 충격량 N·s를 구분한다. 힘은 시간 동안 작용하고 충격량은 운동량 변화로 적용한다.
- 각속도는 rad/s다. 3D 회전은 성분을 그냥 더하지 않고 회전 표현과 좌표계를 확인한다.
- 접촉 법선의 방향과 상대속도 정의를 식마다 맞춘다. 부호가 다르면 같은 식을 그대로 옮기지 않는다.

$$
\begin{aligned}
a&=\frac{F}{m}=\frac{6\,\mathrm N}{2\,\mathrm{kg}}=3\,\mathrm{m/s^2},\\
\Delta v&=a\Delta t=3\times0.5=1.5\,\mathrm{m/s},\\
J&=F\Delta t=6\times0.5=3\,\mathrm{N\,s}=m\Delta v.
\end{aligned}
$$

## 핵심적으로 구분할 것

**검출과 해결:** 충돌 검출은 어떤 형상이 접촉하는지 찾는다. 해결은 그 접촉을 바탕으로 속도와 위치를 조정한다. 포개짐이 있다고 무조건 큰 힘을 주는 것은 두 문제를 섞는 접근이다.

**연속 법칙과 시간 이산화:** $F = ma$가 맞아도 시간 간격과 적분 방법에 따라 결과가 달라진다. 노트의 명시적 Euler와 반암시적 Euler를 구분하고 책의 알고리즘으로 설명한 부분과 개선 대안을 섞지 않는다.

**모델과 실제 물질:** 강체, 선형 스프링, Coulomb 마찰은 가정을 가진 모델이다. 정해진 시간 예산에서 게임에 필요한 동작을 재현하는 목표와 정확한 공학 시뮬레이션을 구분한다.

**고정 시간 간격과 재현성:** 고정 timestep은 안정성을 관리하는 출발점이다. 이것만으로 모든 플랫폼의 결과가 비트 단위로 같아지지는 않는다. 처리 순서, 부동소수점, 스레딩과 입력도 확인해야 한다.

## 자료와 정리 범위

이 시리즈는 공개 목차, 저자의 공개 엔진 코드, 공개된 물리·엔진 기술 자료를 대조한 독립적인 학습 초안이다. 책 전체 본문을 확보해 완독한 기록이나 번역은 아니다. 개념 설명과 작은 예제는 직접 작성하며, 구체적인 책 구현을 확인할 때는 해당 코드나 자료를 출처로 연결한다.

각 장은 원래 주요 절의 순서를 따르되 모든 엔진 구현과 증명을 복원하지 않는다. 이해 점검은 **예상되는 운동 → 계산 → 단위·부호 확인 → 수치 오차와 한계** 순으로 진행한다.

## 참고 자료

### 초안 검증 기록

2026-10-19에 본문 20장과 부록 A–C의 순서 및 장별 주요 절을 공개 2판 목차와 대조했다. 선형대수학 시리즈와 함께 대표 수치 예제 77개를 별도 계산으로 검산했다. 적분 순서의 위치 차이, 스프링 힘, 회전 유효질량을 포함한 충돌, 마찰 한도, 관성축 이동 등을 확인했다.

이는 물리 엔진 전체를 구현해 실행한 결과나 안정성·성능 벤치마크가 아니다. 반복 접촉과 긴 시간의 시뮬레이션은 별도 실습 과제로 남긴다. 두 시리즈의 새 글 34편은 모두 초안이며, 블로그 검사 131개와 빌드·내부 링크 검사도 통과했다.

### 도서와 보충 자료

- [출판사 공식 소개와 목차](https://www.routledge.com/Game-Physics-Engine-Development-How-to-Build-a-Robust-Commercial-Grade/Millington/p/book/9780429099441)
- [O'Reilly: 장 번호와 주요 절](https://www.oreilly.com/library/view/game-physics-engine/9780123819765/)
- [저자의 Cyclone 물리 엔진](https://github.com/idmillington/cyclone-physics)
- [Box2D 공식 문서: 현대 2D 물리 엔진을 비교할 때](https://box2d.org/documentation/)
- [선형대수학 학습 안내](/?post=linear-algebra-6e-overview)
