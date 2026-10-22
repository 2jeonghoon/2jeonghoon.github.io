---
title: "10: 데이터에서 학습하기"
description: "조각별 선형 함수, 작은 학습 실험, 평균·분산·공분산을 연결한다."
date: "2026-10-19"
order: 10
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

## 10.1 조각별 선형 학습 함수

선형변환을 몇 번 합성해도 전체는 선형변환이다.
복잡한 관계를 학습하려면 중간에 비선형 연산이 필요하다.
ReLU는 $\operatorname{ReLU}(t)=\max(0,t)$인 가장 간단한 예다.

$$
\begin{gathered}
f(x)=\operatorname{ReLU}(x)-2\operatorname{ReLU}(x-1)+\operatorname{ReLU}(x-2)\\f(x)=\begin{cases}0&x\le0\\x&0\le x\le1\\2-x&1\le x\le2\\0&x\ge2\end{cases}
\end{gathered}
$$

세 개의 꺾이는 지점을 조합해 삼각형 모양 함수를 얻었다.
입력이 속한 구간이 고정되면 식은 일차식이지만 전체 함수는 하나의 직선이 아니다.
편향이 있는 ReLU 네트워크는 엄밀히는 조각별 아핀함수다.
흔히 이를 조각별 선형이라고 부른다.
경계점에서 미분이 없을 수 있으므로 구현은 그 점의 도함수 관례를 정한다.
관례가 수학적 미분 가능성을 바꾸는 것은 아니다.

### 고차원으로 확장

신경망의 한 층은 $h=\operatorname{ReLU}(Wx+b)$처럼 쓴다.
ReLU는 벡터의 각 성분에 따로 적용한다.

$$
\begin{gathered}
W=\begin{bmatrix}1&0\\0&1\end{bmatrix},\quad b=\begin{bmatrix}-1\\0\end{bmatrix}\\x=\begin{bmatrix}2\\-3\end{bmatrix}\ \Longrightarrow\ Wx+b=\begin{bmatrix}1\\-3\end{bmatrix}\ \Longrightarrow\ h=\begin{bmatrix}1\\0\end{bmatrix}
\end{gathered}
$$

어느 뉴런이 켜지는지 고정하면 그 영역 안에서는 행렬식으로 계산된다.
다른 영역으로 이동하면 활성화 패턴과 식이 바뀐다.
모델의 표현 능력은 커지지만 좋은 데이터와 최적화가 자동으로 보장되지는 않는다.

## 10.2 만들고 실험하기

작은 실험에서는 목표 함수, 데이터 분할, 손실을 먼저 정한다.
아래는 비공개 책의 실험을 재현한 것이 아닌 직접 만든 학습 과제다.
목표 함수는 위 절의 삼각형 $f$다.

$$
\begin{gathered}
\begin{array}{c|rrrrrrr}x_{\mathrm{train}}&-1&0&0.5&1&1.5&2&3\\f(x_{\mathrm{train}})&0&0&0.5&1&0.5&0&0\end{array}\\\begin{array}{c|rrrr}x_{\mathrm{eval}}&0.25&0.75&1.25&1.75\\f(x_{\mathrm{eval}})&0.25&0.75&0.75&0.25\end{array}
\end{gathered}
$$

입력을 그냥 표로 외운 모델은 평가 지점에서 무엇을 할지 정의하지 못한다.
앞 절의 ReLU 식은 그 지점에서도 정답을 계산한다.
이 식의 계수를 이미 아는 것은 학습에 성공했다는 증거가 아니다.
계수를 데이터만으로 찾는 최적화 단계와 별도로 구분한다.
예를 들어 출력 가중치만 학습하면 ReLU 특징에 대한 선형 최소제곱 문제가 된다.
꺾이는 위치까지 학습하면 전체 문제는 일반적으로 비볼록이다.

$$
\begin{gathered}
\phi(x)=\begin{bmatrix}\operatorname{ReLU}(x)\\\operatorname{ReLU}(x-1)\\\operatorname{ReLU}(x-2)\end{bmatrix}\\\widehat f(x)=\phi(x)^{\mathsf T}w,\quad w=\begin{bmatrix}1\\-2\\1\end{bmatrix}
\end{gathered}
$$

학습오차가 작아도 보지 않은 구간에서의 오차는 따로 측정한다.
평가 데이터를 보고 학습 설정을 반복 조정하면 평가 역할이 약해진다.
정규화·중심화의 통계도 학습 데이터에서 계산한 뒤 평가 데이터에 적용한다.
게임 플레이 로그처럼 시간순 데이터이면 미래 정보가 학습에 새지 않게 나눈다.

## 10.3 평균, 분산, 공분산

확률변수의 평균은 기대값이며 분산은 평균에서 떨어진 정도의 제곱 평균이다.
공분산은 두 변수가 함께 평균보다 커지거나 작아지는 경향을 측정한다.
다음 계산은 관측치 3개로 표본 통계를 구한다.

$$
\begin{gathered}
X_{\mathrm{raw}}=\begin{bmatrix}1&2\\2&4\\3&6\end{bmatrix},\quad \mu=(2,4),\quad X=\begin{bmatrix}-1&-2\\0&0\\1&2\end{bmatrix}\\\sum_i(x_i-\bar x)^2=2,\quad \sum_i(y_i-\bar y)^2=8,\quad \sum_i(x_i-\bar x)(y_i-\bar y)=4\\s_x^2=\frac2{3-1}=1,\quad s_y^2=\frac8{3-1}=4,\quad s_{xy}=\frac4{3-1}=2
\end{gathered}
$$

표본 공분산행렬은 $\begin{bmatrix}1&2\\2&4\end{bmatrix}$다.
동일 관측 세 개를 균등한 확률질량 전체로 취급하면 분모는 3이 된다.
표본에서 모분산을 추정하는 $n-1$과 기술적인 제곱편차 평균 $n$을 혼용하지 않는다.
상관계수는 $\frac{s_{xy}}{s_xs_y}=\frac2{1\cdot2}=1$이다.
데이터가 정확한 양의 직선 관계에 있으므로 결과와 일치한다.

공분산행렬은 대칭이며 양의 준정부호다.
위 행렬의 행렬식은 0이고 고유값은 5,0이다.
이는 두 특성이 중복 정보를 담는다는 PCA의 결과와 연결된다.
공분산 0은 일반적으로 독립을 뜻하지 않으며 비선형 관계는 남을 수 있다.
상관관계만으로 인과관계를 결론내리지 않는다.

## 헷갈리기 쉬운 점

- 행렬 표현의 입력·출력 차원과 좌표 관례를 먼저 확인한다.
- 정확한 수학적 결과와 유한 정밀도 알고리즘의 결과를 구별한다.
- 예제에서 확인한 성질이 일반적으로 성립하는 조건을 따로 적는다.

## 복습 질문

**질문.** 관측 (1,2),(2,4),(3,6)의 표본 공분산이 2인 이유는?

**짧은 답.** 중심화한 교차곱 합이 4이고 표본 추정 분모 n-1=2로 나누기 때문이다.

## 함께 볼 공개 자료

[저자 공개 신경망 해설](https://math.mit.edu/~gs/learningfromdata/dsla7-1.pdf)은 비선형 층을 공부하는 보충 자료다. [MIT OCW — 평균·분산·공분산](https://www.ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-20-definitions-and-inequalities/)에서 통계량의 정의를 확인할 수 있다. 이 자료들은 별도 책과 강의에 속하며 6판의 본문과 동일시하지 않는다.
