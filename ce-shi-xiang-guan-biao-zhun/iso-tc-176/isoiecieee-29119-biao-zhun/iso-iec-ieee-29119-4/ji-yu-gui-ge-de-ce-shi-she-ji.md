# 基于规格的测试设计

## 等价类划分\(Equivalence Partitioning\)

### 用途

用于减少测试用例的数量；

### 用法

#### Feature Set -&gt; Test Condition

等价类划分把被测对象输入和输出进行等价划分，每个等价划分作为一个测试规格；

应根据测试依据进行等价划分，每个划分下输入的处理是类似的；

常使用等价划分把输入和输出分为有效和无效两个类型；

只有输出等价划分时，可以根据测试规格书中所描述的处理过程，推导出对应的输入等价划分；

#### Test Condition -&gt; Test Coverage Item

每个等价划分都是一个测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 确定如何使用测试用例覆盖测试覆盖项：
   * 一条用例覆盖一个覆盖项；
   * 一条用例覆盖多个覆盖项；
2. 选取要进行覆盖的测试覆盖项；
3. 确定测试用例的输入参数；
4. 确定测试用例的预期输出；
5. 重复2~4，直到覆盖所有测试覆盖项；

### 测试度量

等价划分覆盖 = 测试用例覆盖的等价划分数 / 等价划分总数；

## [分类树\(Classification Tree Method\)](https://aneejian.com/classification-tree-method-crack-istqb/#what-is-the-classification-tree-method)

### 用途

用于有多个类型输入参数的被测对象的测试；

### 用法

#### Feature Set -&gt; Test Condition

![](../../../../.gitbook/assets/image%20%28105%29.png)

分类树把被测对象输入划分为多个分类\(Classification\)，每个分类的输入再分为多个类型\(Class、SubClass\)，并以树的形式进行展现；见上图；

分类树中的每个分类\(Classification\)都是一个测试规格，如，Privilege、Operation、Access Method；

#### Test Condition -&gt; Test Coverage Item

根据前面的测试规格，生成测试覆盖项；

* **Minimized**

  最小覆盖法，即每个分类的类型取值至少覆盖一次；

* **Maximized** 最大覆盖法，即每个分类的类型取值组合至少覆盖一次；

#### Test Coverage Item -&gt; Test Case

1. 根据测试覆盖项，编写测试用例，选择一个组合进行覆盖；
2. 明确测试用例的输入值；
3. 明确测试用例的预期输出；
4. 重复1~3，直到达到测试覆盖诉求；

### 测试度量

* **Minimized** 分类树测试覆盖 = 测试用例覆盖的类型数量 / 分类树中的类型总数 ****
* **Maximized** 分类树测试覆盖 = 测试用例覆盖的类型组合数量  / 分类树中的所有类型组合数

## 边界值分析\(Boundary Value Analysis\)

### 用法

#### Feature Set -&gt; Test Condition

将被测对象的输入、输出划分为有序集合，并识别其中边界子集，将每个边界作为测试规格；

如， 从\[1, 9\]推倒出两个测试规格，分别是1和9这两个边界值；

#### Test Condition -&gt; Test Coverage Item

测试覆盖项有两种推导方式：

* **Two-value boundary** 两个取值分别为：边界值，边界外侧的值； 如， 边界值1需要测试0和1；
* **Three-value boundary** 三个取值分别为：边界值，边界两侧各一个值； 如，边界值1需要测试0、1、2；

#### Test Coverage Item -&gt; Test Case

1. 确定如何使用测试用例覆盖测试覆盖项：
   * 一条用例覆盖一个覆盖项；
   * 一条用例覆盖多个覆盖项；
2. 选取要进行覆盖的测试覆盖项；
3. 确定测试用例的输入参数；
4. 确定测试用例的预期输出；
5. 重复2~4，直到覆盖所有测试覆盖项；

### 测试度量

边界值测试覆盖 = 测试用例覆盖的边界值数量 / 识别出来的边界值总数；

## 语法测试\(Syntax Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 组合测试设计技术\(Combinatorial Test Design Techniques\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 决策表测试\(Decision Table Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 因果图\(Cause-Effect Graphing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 状态迁移测试\(State Transition Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 场景测试\(Scenario Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 随机测试\(RamdonTesting\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

