---
title: "06: 고유값과 고유벡터"
description: "고유방향, 대각화, 양의 정부호, 복소수와 선형 미분방정식을 잇는다."
date: "2026-10-19"
order: 6
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

## 6.1 고유값 입문: Ax = λx

행렬에 곱해도 방향이 유지되는 0이 아닌 벡터가 고유벡터다.
음의 배율이면 반대 방향으로 향하며, 고유값 0이면 영벡터로 보내진다.
고유값은 그 방향에 작용하는 배율이다.

$$
\begin{gathered}
A=\begin{bmatrix}2&1\\1&2\end{bmatrix}\\A\begin{bmatrix}1\\1\end{bmatrix}=\begin{bmatrix}3\\3\end{bmatrix}=3\begin{bmatrix}1\\1\end{bmatrix}\\A\begin{bmatrix}1\\-1\end{bmatrix}=\begin{bmatrix}1\\-1\end{bmatrix}\\\det(A-\lambda I)=(2-\lambda)^2-1=(\lambda-3)(\lambda-1)
\end{gathered}
$$

고유값은 3과 1이다.
각 고유벡터의 0이 아닌 배수도 같은 고유값에 속한다.
영벡터는 등식을 만족해도 고유벡터라고 부르지 않는다.
고유값의 합은 대각합, 곱은 행렬식이다.
이 예제는 $3+1=4$, $3\times 1=3$으로 검산된다.

## 6.2 행렬의 대각화

독립인 고유벡터가 $n$개 있으면 그 벡터들을 열로 모은 $S$가 가역이다.
$AS=S\Lambda$이므로 $A=S\Lambda S^{-1}$이다.

$$
\begin{gathered}
S=\begin{bmatrix}1&1\\1&-1\end{bmatrix},\quad \Lambda=\operatorname{diag}(3,1),\quad S^{-1}=\frac12S\\A^k=S\operatorname{diag}(3^k,1)S^{-1}\\A^2=\begin{bmatrix}5&4\\4&5\end{bmatrix}
\end{gathered}
$$

반복 적용에서 각 고유방향이 얼마나 커지는지 쉽게 읽을 수 있다.
고유값이 중복되어도 독립인 고유벡터가 충분하면 대각화된다.
중복 고유값이 있다는 사실만으로 실패하거나 성공하지 않는다.
$\begin{bmatrix}1&1\\0&1\end{bmatrix}$은 고유값 1만 가지며 고유공간이 1차원이라 대각화되지 않는다.
따라서 $S$의 가역성을 반드시 확인한다.

## 6.3 대칭 양의 정부호 행렬

실수 대칭행렬은 정규직교 고유벡터 기저를 갖는다.
그래서 $A=Q\Lambda Q^{\mathsf T}$로 대각화할 수 있다.
대칭 양의 정부호는 모든 0이 아닌 $x$에 대해 $x^{\mathsf T} A x>0$인 경우다.

$$
\begin{gathered}
Q=\frac1{\sqrt2}\begin{bmatrix}1&1\\1&-1\end{bmatrix},\quad x=\begin{bmatrix}a\\b\end{bmatrix}\\x^{\mathsf T}Ax=2a^2+2ab+2b^2=(a+b)^2+a^2+b^2>0\quad(x\ne0)
\end{gathered}
$$

대칭행렬에서 양의 정부호는 모든 고유값이 양수인 것과 동치다.
$A$의 고유값 3,1이 양수이므로 위 부등식과 일치한다.
양의 준정부호는 부등호가 $\ge 0$이고 0 고유값도 허용한다.
에너지의 이차형식과 최적화의 곡률을 이해하는 출발점이다.
실수 대칭이라는 가정을 빠뜨린 채 같은 판정을 적용하지 않는다.

## 6.4 복소수, 벡터, 행렬

실수 행렬도 복소 고유값을 가질 수 있다.
평면의 90도 회전은 실수 직선 하나를 그대로 유지하지 않는다.

$$
\begin{gathered}
R=\begin{bmatrix}0&-1\\1&0\end{bmatrix}\\\det(R-\lambda I)=\lambda^2+1=0\ \Longrightarrow\ \lambda=\pm i\\R\begin{bmatrix}1\\-i\end{bmatrix}=\begin{bmatrix}i\\1\end{bmatrix}=i\begin{bmatrix}1\\-i\end{bmatrix}
\end{gathered}
$$

복소 벡터의 길이는 켤레전치를 사용한다.
$x^*$를 켤레전치라고 쓰면 $\|x\|^2=x^*x$다.
예제 벡터 $(1,-i)$의 길이 제곱은 $1+\overline{(-i)}(-i)=1+i(-i)=2$다.
실수의 $Q^{\mathsf T} Q=I$는 복소수에서 $Q^*Q=I$라는 유니터리 조건으로 확장된다.
이 절의 $*$는 단순한 성분별 곱 표시가 아니다.
실수 행렬의 비실수 고유값은 켤레 쌍으로 나타난다.

## 6.5 선형 미분방정식 풀기

상수행렬 선형계 $\frac{du}{dt}=Au$에서 고유방향마다 지수함수가 생긴다.
$Av=\lambda v$라면 $u(t)=e^{\lambda t}v$를 대입해 직접 확인할 수 있다.

$$
\begin{gathered}
A=\begin{bmatrix}2&1\\1&2\end{bmatrix},\quad u(0)=\begin{bmatrix}1\\0\end{bmatrix}=\frac12\begin{bmatrix}1\\1\end{bmatrix}+\frac12\begin{bmatrix}1\\-1\end{bmatrix}\\u(t)=\frac12e^{3t}\begin{bmatrix}1\\1\end{bmatrix}+\frac12e^t\begin{bmatrix}1\\-1\end{bmatrix}
\end{gathered}
$$

$t=0$에서 초기조건을 만족한다.
미분하면 각 성분의 계수 3과 1이 $Au$의 결과와 일치한다.
일반해는 $u(t)=\exp(At)u(0)$이며 대각화되지 않아도 행렬지수는 정의된다.
고유값의 실수부가 모두 음수이면 상수계의 모든 해가 0으로 감쇠한다.
연속시간 안정성과 시간적분 알고리즘의 안정성은 별도 문제다.
예를 들어 감쇠하는 계도 큰 시간간격의 명시적 Euler로는 발산할 수 있다.

## 헷갈리기 쉬운 점

- 행렬 표현의 입력·출력 차원과 좌표 관례를 먼저 확인한다.
- 정확한 수학적 결과와 유한 정밀도 알고리즘의 결과를 구별한다.
- 예제에서 확인한 성질이 일반적으로 성립하는 조건을 따로 적는다.

## 복습 질문

**질문.** 고유값이 모두 양수인 위 $A$의 $\frac{du}{dt}=Au$는 감쇠하는가?

**짧은 답.** 아니다. $e^{3t}$, $e^t$가 성장한다. 양의 정부호와 동역학적 감쇠는 구별한다.

## 함께 볼 공개 자료

[MIT OCW — 고유값과 고유벡터](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/eigenvalues-and-eigenvectors/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
