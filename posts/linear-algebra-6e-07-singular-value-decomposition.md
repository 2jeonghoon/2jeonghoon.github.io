---
title: "07: 특잇값 분해와 PCA"
description: "직사각형 행렬을 정규직교 방향과 배율로 분해하고 저랭크 근사를 이해한다."
date: "2026-10-19"
order: 7
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

## 7.1 특잇값과 특이벡터

실수 $m\times n$ 행렬은 $A=U\Sigma V^{\mathsf T}$로 분해할 수 있다.
$U,V$는 출력과 입력의 정규직교 기저이며 $\Sigma$는 음이 아닌 대각 배율이다.
직사각형 행렬에도 적용된다는 점이 보통의 고유값 분해와 다르다.

$$
\begin{gathered}
A=\begin{bmatrix}3&0\\0&1\\0&0\end{bmatrix},\quad V=I_2,\quad U=I_3,\quad \Sigma=\begin{bmatrix}3&0\\0&1\\0&0\end{bmatrix}\\\sigma_1=3,\quad \sigma_2=1,\quad Av_1=3u_1,\quad Av_2=u_2
\end{gathered}
$$

단위 원은 길이 3과 1의 반축을 갖는 타원으로 간다.
0이 아닌 특잇값의 수가 랭크다.
오른쪽 특이벡터는 $A^{\mathsf T} A$의 고유벡터다.
위 예제의 $A^{\mathsf T} A=\operatorname{diag}(9,1)$에서 제곱근을 취해 3,1을 얻는다.
왼쪽 특이벡터는 $AA^{\mathsf T}$와 연결된다.
특잇값은 고유값의 절댓값과 일반적으로 같지 않다.
실제 계산에서는 $A^{\mathsf T} A$를 직접 만드는 방식이 작은 특잇값의 정확도를 해칠 수 있다.

### 랭크 1 항으로 보기

SVD는 여러 개의 바깥곱을 더한 식으로도 읽는다.

$$
\begin{gathered}
A=3u_1v_1^{\mathsf T}+u_2v_2^{\mathsf T}\\u_1=\begin{bmatrix}1\\0\\0\end{bmatrix},\quad v_1=\begin{bmatrix}1\\0\end{bmatrix},\quad u_2=\begin{bmatrix}0\\1\\0\end{bmatrix},\quad v_2=\begin{bmatrix}0\\1\end{bmatrix}
\end{gathered}
$$

각 항의 랭크는 1이며 입력 방향 하나와 출력 방향 하나를 연결한다.
특잇값은 보통 큰 순서로 나열한다.
중복 특잇값에서는 그 부분공간 안의 기저 선택이 유일하지 않다.
벡터의 부호도 함께 뒤집을 수 있으므로 결과 배열을 그대로 비교하지 않는다.

## 7.2 선형대수로 보는 영상 처리

회색조 영상을 행렬로 보고 큰 특잇값 항부터 보관할 수 있다.
작은 항을 버리면 저장량을 줄이는 대신 오차가 생긴다.
다음은 픽셀 배열 자체보다 원리를 확인하기 위한 작은 예제다.

$$
\begin{gathered}
M=\begin{bmatrix}3&0\\0&1\end{bmatrix},\quad M_1=\begin{bmatrix}3&0\\0&0\end{bmatrix}\\M-M_1=\begin{bmatrix}0&0\\0&1\end{bmatrix}\\\|M-M_1\|_F=1,\quad \|M-M_1\|_2=1
\end{gathered}
$$

SVD의 상위 $k$항은 랭크 $k$ 이하 행렬 중 Frobenius 노름과 2-노름에서 최적 근사다.
위 예제에서는 버린 특잇값이 1이라 두 오차도 1이다.
일반적으로 Frobenius 오차 제곱은 버린 특잇값 제곱의 합이다.

$$
\|A-A_k\|_F^2=\sum_{j=k+1}^{r}\sigma_j^2,\qquad \|A-A_k\|_2=\sigma_{k+1}\quad(k<r)
$$
2-노름 오차는 그중 가장 큰 값인 $\sigma_{k+1}$이다.
랭크 $k$ 표현은 대략 $k(m+n+1)$개의 수를 보관한다.
작은 행렬이나 큰 $k$에서는 원본 $mn$개보다 오히려 많을 수 있다.
영상의 지각적 품질과 이 수학적 오차 기준도 완전히 같지는 않다.

## 7.3 SVD로 구하는 주성분 분석

이 글에서는 데이터 행 하나가 관측 하나, 열 하나가 특성 하나다.
먼저 열마다 평균을 빼서 중심화한 행렬 $X$를 만든다.
주성분 방향은 중심화 데이터의 분산을 크게 유지하는 특성 공간의 방향이다.

$$
\begin{gathered}
X_{\mathrm{raw}}=\begin{bmatrix}1&2\\2&4\\3&6\end{bmatrix},\quad \mu=\begin{bmatrix}2&4\end{bmatrix}\\X=\begin{bmatrix}-1&-2\\0&0\\1&2\end{bmatrix},\quad X^{\mathsf T}X=\begin{bmatrix}2&4\\4&8\end{bmatrix}\\S=\frac{X^{\mathsf T}X}{3-1}=\begin{bmatrix}1&2\\2&4\end{bmatrix}
\end{gathered}
$$

$S$의 고유값은 5와 0이다.
첫 주성분 방향은 $v_1=\frac1{\sqrt5}(1,2)$다.
$X$의 첫 특잇값은 $\sqrt{10}$이고 두 번째는 0이다.
투영 좌표 $Xv_1$은 $(-\sqrt{5},0,\sqrt{5})$다.
여기서는 데이터가 한 직선 위에 있어 1차원으로 줄여도 중심화 데이터를 정확히 복원한다.

### 복원과 설명분산

주성분 좌표를 $z$라고 하면 $zv_1^{\mathsf T}$로 중심화된 관측을 복원한다.
마지막에 평균 $(2,4)$를 다시 더해야 원래 좌표로 돌아온다.
설명분산 비율은 선택한 고유값 합을 전체 고유값 합으로 나눈 값이다.
이 예제는 $\frac5{5+0}=1$이다.
단위가 크게 다른 특성은 표준화 여부에 따라 주성분이 달라진다.
표준화는 자동으로 옳은 선택이 아니라 분석 목적에 맞춘 결정이다.
게임 플레이 데이터의 특성 압축에도 같은 계산이 쓰일 수 있다.

## 헷갈리기 쉬운 점

- 행렬 표현의 입력·출력 차원과 좌표 관례를 먼저 확인한다.
- 정확한 수학적 결과와 유한 정밀도 알고리즘의 결과를 구별한다.
- 예제에서 확인한 성질이 일반적으로 성립하는 조건을 따로 적는다.

## 복습 질문

**질문.** PCA에서 중심화를 생략하면 무엇이 달라지는가?

**짧은 답.** 평균으로부터의 변동 대신 원점에 대한 크기까지 섞인다. 평균 제거 후의 주성분과 일반적으로 다르다.

## 함께 볼 공개 자료

[MIT OCW — SVD](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/positive-definite-matrices-and-applications/singular-value-decomposition/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
