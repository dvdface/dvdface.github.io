---
description: >-
  Deriving Test Cases from Use Cases: A Four-Step Process from <Managing
  Software Requirements: A Use Case Approach>
---

# 四步测试用例设计法

## 读后感：

`此方法和场景描述的5W1H1E类似，H对应主选流，E对应备选流；`

### 步骤一：分析测试场景

分析流图：

![&#x68B3;&#x7406;&#x6D41;&#x7A0B;&#x56FE;&#xFF0C;&#x5305;&#x542B;&#x4E3B;&#x9009;&#x6D41;&#x548C;&#x5907;&#x9009;&#x6D41;](../../../.gitbook/assets/image%20%28150%29.png)

根据流图梳理场景组合：

![](../../../.gitbook/assets/image%20%28161%29.png)

### 步骤二：识别用例输入输出参数

识别测试用例的输入和输出参数：

![](../../../.gitbook/assets/image%20%28159%29.png)

### 步骤三：识别根据输入和输出参数的组合列出所有可能的测试条件

根据输入和输出参数的关系推导得到具体的数据分为三类，Valid， Invalid， Unavailable；

采取类似判定表的方式，列出所有可能组合下的测试条件

![](../../../.gitbook/assets/image%20%28151%29.png)

### 步骤四：编写具体的用例

填上参数，输出具体用例

![](../../../.gitbook/assets/image%20%28153%29.png)



