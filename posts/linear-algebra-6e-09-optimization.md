---
title: "09: 선형대수와 최적화"
description: "다변수 최소화, 역전파, 제약조건과 쌍대성을 작은 문제로 익힌다."
date: "2026-10-19"
order: 9
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra", "Mathematics", "Study Notes"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=linear-algebra-6e-overview)

[6판 공식 목차](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)의 순서로 개념을 재구성한 개인 공부 노트다. 공개 목차와 MIT 자료를 참고했으며 책 전체 본문을 읽고 축약한 글은 아니다. 계산과 연습 예제는 직접 구성했다.

기본은 실수 열벡터이며 $A^{\mathsf T}$는 전치다. 복소수는 해당 절에서 별도로 다룬다.

## 9.1 다변수 함수의 최소화

여러 변수에서 미분을 모은 벡터가 그래디언트다.
내부 최소점의 필요조건은 그래디언트 0이다.
그러나 극대점과 안장점도 이 조건을 만족하므로 곡률을 더 살펴야 한다.

$$
\begin{gathered}
f(x,y)=\frac12(2x^2+2xy+2y^2)-3x-3y\\\nabla f=\begin{bmatrix}2x+y-3\\x+2y-3\end{bmatrix},\quad H=\begin{bmatrix}2&1\\1&2\end{bmatrix}\\\nabla f=0\ \Longrightarrow\ (x,y)=(1,1)
\end{gathered}
$$

Hessian $H$는 고유값이 3과 1인 양의 정부호다.
이 이차함수는 엄격히 볼록하므로 $(1,1)$이 유일한 전역 최소점이다.
일반적으로 $f(x)=\frac12 x^{\mathsf T} Hx-b^{\mathsf T} x$에서 대칭 $H$이면 그래디언트는 $Hx-b$다.
경사하강법은 $x_{\mathrm{next}}=x-\eta \nabla f(x)$로 갱신한다.
이 양의 정부호 이차함수에서는 $0<\eta<\frac2{\lambda_{\max}}$이면 모든 초기점에서 수렴한다.
예제에서 $\eta=1/2$, 시작점 $(0,0)$이면 다음 점은 $(1.5,1.5)$다.
한 번의 갱신이 해 자체를 주는 것은 아니다.

## 9.2 역전파와 확률적 경사하강법

역전파는 합성함수의 연쇄법칙을 계산 그래프의 역순으로 적용한다.
행렬곱의 역방향에서는 전치가 자연스럽게 등장한다.

$$
\begin{gathered}
z=Wx,\quad L=\frac12\|z-y\|^2,\quad r=z-y\\\nabla_W L=rx^{\mathsf T},\quad \nabla_x L=W^{\mathsf T}r
\end{gathered}
$$

$x$가 $n\times 1$, $r$이 $m\times 1$이면 $\nabla_W$는 $m\times n$이다.
스칼라 예제로 $x=2,y=5,w=1$을 사용하자.
예측 $wx=2$, 잔차 -3, 손실 4.5, 미분 $(-3)\times 2=-6$이다.
$\eta=0.1$이면 $w_{\mathrm{next}}=1.6$, 새 손실은 $\frac12(3.2-5)^2=1.62$다.

확률적 경사하강법은 전체 데이터 대신 일부 표본으로 그래디언트를 추정한다.
미니배치는 여러 표본의 기여를 평균하거나 합한다.
어느 관례를 쓰는지에 따라 학습률의 의미도 달라진다.
작은 배치의 손실이 매번 감소할 필요는 없다.
비선형 신경망에서는 앞 절의 이차함수 수렴 조건을 그대로 적용할 수 없다.

## 9.3 제약, Lagrange 승수, 최소노름

제약조건이 있으면 허용된 방향 안에서 최적점을 찾아야 한다.
승수는 목적함수의 그래디언트와 제약의 법선 방향을 연결한다.

$$
\begin{gathered}
\min_{x+y=2}\frac12(x^2+y^2)\\\mathcal L=\frac12(x^2+y^2)-\lambda(x+y-2)\\\frac{\partial\mathcal L}{\partial x}=x-\lambda=0,\quad \frac{\partial\mathcal L}{\partial y}=y-\lambda=0\\x+y=2\ \Longrightarrow\ \lambda=1,\quad x=y=1
\end{gathered}
$$

이는 직선 $x+y=2$에서 원점에 가장 가까운 점이다.
승수의 부호는 Lagrangian 정의에 따라 바뀔 수 있다.
벡터식에서 최소노름 문제 $\min_{Ax=b}\frac12\|x\|^2$는 $x=A^{\mathsf T} \lambda$를 준다.
$A$가 완전 행랭크이면 $AA^{\mathsf T} \lambda=b$를 푼다.
해는 $x=A^{\mathsf T}(AA^{\mathsf T})^{-1}b=A^+b$다.
행들이 종속이면 역행렬 공식 대신 의사역행렬이나 독립 제약을 사용한다.

## 9.4 선형계획, 게임이론, 쌍대성

선형계획은 선형 목적함수를 선형 제약 아래 최적화한다.
쌍대변수는 원래 문제의 최적값을 제한하는 값을 만든다.

$$
\begin{gathered}
\max_{x,y}\ x+y\\x\ge0,\quad y\ge0,\quad x+y\le4,\quad x\le3\\(x,y)=(3,1)\ \Longrightarrow\ x+y=4\\x+y\le4\ \Longrightarrow\ \text{최적값}=4
\end{gathered}
$$

쌍대문제는 $\min 4u+3v$, $u+v\ge 1, u\ge 1, u,v\ge 0$이다.
$u=1,v=0$은 쌍대가능하며 값 4를 준다.
원문제의 값과 쌍대값이 같으므로 위 해가 최적임을 인증한다.
최적해는 $(3,1)$ 하나뿐이 아니라 $(x,4-x), 0\le x\le 3$ 전체다.
유한 최적해가 있는 표준 선형계획에서는 강한 쌍대성이 성립한다.

제로섬 게임에서는 혼합전략의 확률을 변수로 삼아 같은 구조를 얻는다.
보수행렬 $\begin{bmatrix}1&-1\\-1&1\end{bmatrix}$에서 각 전략을 반반 섞으면 기대보수는 0이다.
상대가 어느 순수전략을 골라도 0이므로 이 혼합전략이 균형을 이룬다.
게임이론의 게임은 비디오게임의 물리 시뮬레이션과 다른 수학적 문맥이다.

## 헷갈리기 쉬운 점

- 행렬 표현의 입력·출력 차원과 좌표 관례를 먼저 확인한다.
- 정확한 수학적 결과와 유한 정밀도 알고리즘의 결과를 구별한다.
- 예제에서 확인한 성질이 일반적으로 성립하는 조건을 따로 적는다.

## 복습 질문

**질문.** 그래디언트가 0이면 항상 최소점인가?

**짧은 답.** 아니다. $-x^2$는 극대점, $x^2-y^2$는 안장점에서도 그래디언트가 0이다.

## 함께 볼 공개 자료

[MIT OCW — 역전파](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-27-backpropagation-find-partial-derivatives/)에서 연쇄법칙과 역방향 미분을, [MIT OCW — 확률적 경사하강법](https://www.ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-25-stochastic-gradient-descent/)에서 미니배치 갱신을 보충한다. 이는 별도 강의이며 6판의 본문 요약이 아니다.
