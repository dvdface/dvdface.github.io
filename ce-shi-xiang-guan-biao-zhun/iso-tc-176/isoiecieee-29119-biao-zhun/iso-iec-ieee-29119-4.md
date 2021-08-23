---
description: 'Software and systems engineering — Software testing — Part 4:  Test techniques'
---

# ISO/IEC/IEEE 29119-4

## 概述

![&#x6D4B;&#x8BD5;&#x8BBE;&#x8BA1;&#x4E0E;&#x5B9E;&#x73B0;&#x8FC7;&#x7A0B;](../../../.gitbook/assets/1629686093-1-%20%282%29.png)

测试设计技术，主要用于以上过程的以下部分：

* 根据Feature Set推导Test Condition \(TD2\)
* 根据Test Condition推导Test Coverage Item \(TD3\)
* 根据Test Coverage Item推导Test Case \(TD4\)

#### **测试规格\(Test Condition\)**

测试规格是被测项中可测试的部分，功能、事务、特性、质量属性、结构元素等等可以作为测试依据的部分；

可以和干系人一起商量把哪些属性作为测试规格，或者自行通过测试技术进行推导；

#### **测试覆盖项\(Test Coverage Item\)**

测试覆盖项是测试规格中可测试覆盖的属性；

单个测试规格可以作为一个或者多个测试覆盖项的依据；

#### **测试用例\(Test Case\)**

测试用例是预置条件、输入和预期输出组成的集合；

主要是用于所覆盖的被测对象部分是否正确的进行了实现；

## 测试设计技术类型

29119-4定义了三种测试设计技术类型：

* **基于规格的测试设计** 将需求、规格、模型和用户需求作为测试设计的主要依据；
* **基于结构的测试设计** 将源码、代码的结构作为测试设计的主要依据；
* **基于经验的测试设计** 将测试人员的知识和经验作为测试的主要依据；

![](../../../.gitbook/assets/image%20%28104%29.png)



