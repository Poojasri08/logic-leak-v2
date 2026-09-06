# Day 11 – Authentication & Duplicate Reward Testing



## Objective



Test the authentication and scoring mechanisms of Logic Leak 2.0 and verify that unauthorized requests cannot submit answers or repeatedly claim points.



## Tests Performed



| Test                                       | Expected Result             | Status |

| ------------------------------------------ | --------------------------- | ------ |

| Request without token                      | HTTP 401                    | ✅ PASS |

| Invalid/expired token                      | HTTP 403                    | ✅ PASS |

| Valid login                                | Valid authentication token  | ✅ PASS |

| Valid token + wrong answer                 | `correct:false`, `points:0` | ✅ PASS |

| Duplicate Tier 1 submission                | No additional points        | ✅ PASS |

| Duplicate submission after backend restart | No additional points        | ✅ PASS |



## Duplicate Reward Test



Challenge 1, Tier 1 uses the configured answer:



`sql injection`



The first valid completion awarded:



`30 points`



A repeated submission returned:



```text

correct: true

points: 0

message: Tier 1 already completed

```



The test was then repeated after restarting the backend. The completion state persisted and no additional points were awarded.



## Security Result



**PASS**



The current implementation prevents repeated completion of the same Tier 1 challenge from awarding additional points, and the completion state persists across backend restarts.



## Key Learning



Security testing is not limited to checking whether an endpoint works. It also requires testing authentication failures, invalid requests, repeated submissions, and persistence of security-relevant state.



## Next



Day 12 will focus on **tier access-control testing**, specifically verifying that users cannot bypass Tier 1 and directly access higher-tier rewards.



