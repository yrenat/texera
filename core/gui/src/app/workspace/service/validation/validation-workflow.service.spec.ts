/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { inject, TestBed } from "@angular/core/testing";
import { ValidationWorkflowService } from "./validation-workflow.service";
import {
  mockPoint,
  mockResultPredicate,
  mockScanPredicate,
  mockScanResultLink,
  mockScanSentimentLink,
  mockSentimentPredicate,
} from "../workflow-graph/model/mock-workflow-data";
import { WorkflowActionService } from "../workflow-graph/model/workflow-action.service";
import { UndoRedoService } from "../undo-redo/undo-redo.service";
import { OperatorMetadataService } from "../operator-metadata/operator-metadata.service";
import { StubOperatorMetadataService } from "../operator-metadata/stub-operator-metadata.service";
import { JointUIService } from "../joint-ui/joint-ui.service";
import { marbles } from "rxjs-marbles";
import { WorkflowUtilService } from "../workflow-graph/util/workflow-util.service";
import { map } from "rxjs/operators";
import { commonTestProviders } from "../../../common/testing/test-utils";

describe("ValidationWorkflowService", () => {
  let validationWorkflowService: ValidationWorkflowService;
  let workflowActionservice: WorkflowActionService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkflowActionService,
        WorkflowUtilService,
        UndoRedoService,
        ValidationWorkflowService,
        JointUIService,
        {
          provide: OperatorMetadataService,
          useClass: StubOperatorMetadataService,
        },
        ...commonTestProviders,
      ],
    });

    validationWorkflowService = TestBed.get(ValidationWorkflowService);
    workflowActionservice = TestBed.get(WorkflowActionService);
  });

  it("should be created", inject([ValidationWorkflowService], (service: ValidationWorkflowService) => {
    expect(service).toBeTruthy();
  }));

  it("should receive true from validateOperator when operator box is connected and required properties are complete ", () => {
    workflowActionservice.addOperator(mockScanPredicate, mockPoint);
    workflowActionservice.addOperator(mockResultPredicate, mockPoint);
    workflowActionservice.addLink(mockScanResultLink);
    const newProperty = { tableName: "test-table" };
    workflowActionservice.setOperatorProperty(mockScanPredicate.operatorID, newProperty);
    expect(validationWorkflowService.validateOperator(mockResultPredicate.operatorID).isValid).toBeTruthy();
    expect(validationWorkflowService.validateOperator(mockScanPredicate.operatorID).isValid).toBeTruthy();
  });

  it(
    "should subscribe the changes of validateOperatorStream when operator box is connected and required properties are complete ",
    marbles(m => {
      const testEvents = m.hot("-a-b-c----d-", {
        a: () => workflowActionservice.addOperator(mockScanPredicate, mockPoint),
        b: () => workflowActionservice.addOperator(mockResultPredicate, mockPoint),
        c: () => workflowActionservice.addLink(mockScanResultLink),
        d: () => workflowActionservice.setOperatorProperty(mockScanPredicate.operatorID, { tableName: "test-table" }),
      });

      testEvents.subscribe(action => action());

      const expected = m.hot("-u-v-(yz)-m-", {
        u: { operatorID: "1", isValid: false },
        v: { operatorID: "3", isValid: false },
        y: { operatorID: "1", isValid: false },
        z: { operatorID: "3", isValid: true },
        m: { operatorID: "1", isValid: true },
      });

      m.expect(
        validationWorkflowService.getOperatorValidationStream().pipe(
          map(value => ({
            operatorID: value.operatorID,
            isValid: value.validation.isValid,
          }))
        )
      ).toBeObservable(expected);
    })
  );

  it("should receive false from validateOperator when operator box is not connected or required properties are not complete ", () => {
    workflowActionservice.addOperator(mockScanPredicate, mockPoint);
    workflowActionservice.addOperator(mockResultPredicate, mockPoint);
    workflowActionservice.addLink(mockScanResultLink);
    expect(validationWorkflowService.validateOperator(mockResultPredicate.operatorID).isValid).toBeTruthy();
    expect(validationWorkflowService.validateOperator(mockScanPredicate.operatorID).isValid).toBeFalsy();
  });

  // TODO: this test is incompatible with shared editing.
  // it(
  //   "should subscribe the changes of validateOperatorStream when one operator box is deleted after valid status ",
  //   marbles(m => {
  //     const testEvents = m.hot("-a-b-c----d-e-----", {
  //       a: () => workflowActionservice.addOperator(mockScanPredicate, mockPoint),
  //       b: () => workflowActionservice.addOperator(mockResultPredicate, mockPoint),
  //       c: () => workflowActionservice.addLink(mockScanResultLink),
  //       d: () => workflowActionservice.setOperatorProperty(mockScanPredicate.operatorID, { tableName: "test-table" }),
  //       e: () => workflowActionservice.deleteOperator(mockResultPredicate.operatorID),
  //     });
  //
  //     testEvents.subscribe(action => action());
  //
  //     const expected = m.hot("-t-u-(vw)-x-(yz)-)", {
  //       t: { operatorID: "1", isValid: false },
  //       u: { operatorID: "3", isValid: false },
  //       v: { operatorID: "1", isValid: false },
  //       w: { operatorID: "3", isValid: true },
  //       x: { operatorID: "1", isValid: true },
  //       y: { operatorID: "1", isValid: false }, // If one of the oprator is deleted, the other one is invaild since it is isolated
  //       z: { operatorID: "3", isValid: false },
  //     });
  //
  //     m.expect(
  //       validationWorkflowService.getOperatorValidationStream().pipe(
  //         map(value => ({
  //           operatorID: value.operatorID,
  //           isValid: value.validation.isValid,
  //         }))
  //       )
  //     ).toBeObservable(expected);
  //   })
  // );

  it(
    "should subscribe the changes of validateOperatorStream when operator link is deleted after valid status ",
    marbles(m => {
      const testEvents = m.hot("-a-b-c----d-e-f--", {
        a: () => workflowActionservice.addOperator(mockScanPredicate, mockPoint),
        b: () => workflowActionservice.addOperator(mockSentimentPredicate, mockPoint),
        c: () => workflowActionservice.addLink(mockScanSentimentLink),
        d: () => workflowActionservice.setOperatorProperty(mockScanPredicate.operatorID, { tableName: "test-table" }),
        e: () =>
          workflowActionservice.setOperatorProperty(mockSentimentPredicate.operatorID, {
            attribute: "test-attribute",
            resultAttribute: "result-attribtue",
          }),
        f: () => workflowActionservice.deleteLinkWithID(mockScanSentimentLink.linkID),
      });

      testEvents.subscribe(action => action());

      const expected = m.hot("-s-t-(uv)-w-x-(yz)-", {
        s: { operatorID: "1", isValid: false },
        t: { operatorID: "2", isValid: false },
        u: { operatorID: "1", isValid: false },
        v: { operatorID: "2", isValid: false },
        w: { operatorID: "1", isValid: true },
        x: { operatorID: "2", isValid: true },
        y: { operatorID: "1", isValid: true },
        z: { operatorID: "2", isValid: false }, // If the link is deleted, the one missing input link is invalid
      });

      m.expect(
        validationWorkflowService.getOperatorValidationStream().pipe(
          map(value => ({
            operatorID: value.operatorID,
            isValid: value.validation.isValid,
          }))
        )
      ).toBeObservable(expected);
    })
  );

  it("should consider disabled operators when validating workflow", () => {
    workflowActionservice.addOperator(mockScanPredicate, mockPoint);
    workflowActionservice.addOperator(mockResultPredicate, mockPoint);
    workflowActionservice.addLink(mockScanResultLink);
    workflowActionservice.setOperatorProperty(mockScanPredicate.operatorID, {
      tableName: "test-table",
    });
    expect(Object.entries(validationWorkflowService.getCurrentWorkflowValidationError().errors).length).toEqual(0);

    const mockScanPredicate2 = {
      ...mockScanPredicate,
      operatorID: "mockScan2",
    };
    const mockResultPredicate2 = {
      ...mockResultPredicate,
      operatorID: "mockResult2",
    };
    const mockScanResultLink2 = {
      linkID: "mock-scan-result-link-2",
      source: {
        operatorID: mockScanPredicate2.operatorID,
        portID: mockScanPredicate2.outputPorts[0].portID,
      },
      target: {
        operatorID: mockResultPredicate2.operatorID,
        portID: mockResultPredicate2.inputPorts[0].portID,
      },
    };

    workflowActionservice.addOperator(mockScanPredicate2, mockPoint);
    workflowActionservice.addOperator(mockResultPredicate2, mockPoint);
    workflowActionservice.addLink(mockScanResultLink2);
    console.log(validationWorkflowService.getCurrentWorkflowValidationError().errors);
    expect(Object.entries(validationWorkflowService.getCurrentWorkflowValidationError().errors).length).toEqual(1);

    workflowActionservice.getTexeraGraph().disableOperator(mockScanPredicate2.operatorID);
    workflowActionservice.getTexeraGraph().disableOperator(mockResultPredicate2.operatorID);
    expect(Object.entries(validationWorkflowService.getCurrentWorkflowValidationError().errors).length).toEqual(0);
  });
});
