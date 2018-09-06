/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/task'],
/**
 * @param {email} email
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(email, record, runtime, search, task) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
	
	// Global Variable
	var foundContractId = false;
	
	function beforeSubmit(context) {
		
		// if type is not 'create' or 'edit' exit the script 
    	if(context.type !== context.UserEventType.CREATE
    			&& context.type !== context.UserEventType.EDIT) {
    		log.audit('Non-Create Script Exiting');
    		
    		return;
    	}
    	
    	// if context is 'edit' and custbody_csod_run_project_auto_tag is not checked
    	// then exit script
    	if(context.type === context.UserEventType.EDIT && !newRec.getValue('custbody_csod_run_project_auto_tag')) {
    		log.audit('custbody_csod_run_project_auto_tag is not checked. Exiting. SO - ' + newRec.id);
    		return;
    	}
		
		var newRec = context.newRecord;
    	var oldRec = context.oldRecord;
    	
    	// running this logic here to trigger workflow
    	const itemCount = newRec.getLineCount({sublistId: 'item'});
    	
    	for(var i = 0; i < itemCount; i++) {
    		// if the line has custcol_csod_mavenlink_id
    		var mavenlinkId = newRec.getSublistValue({
    			sublistId: 'item',
    			fieldId: 'custcol_csod_mavenlink_id',
    			line: i
    		});
    		
    		
    		// check if project ID is there
    		var projectId = newRec.getSublistValue({
    			sublistId: 'item',
    			fieldId: 'job',
    			line: i
    		});
    		
    		if(mavenlinkId && !projectId) {
    	    	
    	    	if(!foundContractId) {
    				contractId = getContractId(mavenlinkId);
    				
    				log.audit('Contract ID = ' + contractId);
    				
    				
    				
    				// if contractId is found 
    				if(contractId !== '') {
    					
    					// update customer on contract
    					updateCustomerOnContract(contractId, entityId);
    					// set foundContractId to true
    					foundContractId = true;
    					// set custbody_contract_id to contractId
    					newRec.setValue({
    						fieldId: 'custbody_contract_id',
    						value: contractId
    					});
    				}
    			}
    		}
    	}
    		

    	
	}
    
    // If old billing schedule and new billing schedule is different than change the billing schedule to old one
    function afterSubmit(context) {
    	
    	// if type is not 'create' or 'edit' exit the script 
    	if(context.type !== context.UserEventType.CREATE
    			&& context.type !== context.UserEventType.EDIT) {
    		log.audit('Non-Create Script Exiting');
    		
    		return;
    	}
    	
    	var newRec = context.newRecord;
    	var oldRec = context.oldRecord;
    	var recordToSubmit = record.load({
    		type: record.Type.SALES_ORDER,
    		id: newRec.id,
    		isDynamic: true
    	});
    	var sendEmail = false;
    	
    	var failedLines = [];
    	
    	var linesCommited = 0;
    	
    	// if context is 'edit' and custbody_csod_run_project_auto_tag is not checked
    	// then exit script
    	if(context.type === context.UserEventType.EDIT && !newRec.getValue('custbody_csod_run_project_auto_tag')) {
    		log.audit('custbody_csod_run_project_auto_tag is not checked. Exiting. SO - ' + newRec.id);
    		return;
    	}
    	
    	// get line count
    	const itemCount = newRec.getLineCount({sublistId: 'item'});
    	
    	// get transaction currency 
    	const tranCurrency = newRec.getValue('currency');
    	
    	// get client id
    	const entityId = newRec.getValue('entity');
    	
    	var contractId = '';
    	
    	log.debug({
    		title: newRec.id + ' Sales Order with line count',
    		details: 'itemCount: ' + itemCount
    	});
    	
    	// iterate line count
    	for(var i = 0; i < itemCount; i++) {
    		
    		
    		// if the line has custcol_csod_mavenlink_id
    		var mavenlinkId = newRec.getSublistValue({
    			sublistId: 'item',
    			fieldId: 'custcol_csod_mavenlink_id',
    			line: i
    		});
    		
    		
    		// check if project ID is there
    		var projectId = newRec.getSublistValue({
    			sublistId: 'item',
    			fieldId: 'job',
    			line: i
    		});
    		
    		/*
    		log.debug({
    			title: 'line ' + i,
    			details: 'mavenlinkId: ' + mavenlinkId
    		});
    		log.debug({
    			title: 'line ' + i,
    			details: 'the line has projectId: ' + projectId
    		});
    		*/
    		// if mavenlinkID is true and project id empty
    		if(mavenlinkId && !projectId) {
    			
    			// if foundContractId is false find contract id to fill in custbody_contract_id
    			if(!foundContractId) {
    				contractId = getContractId(mavenlinkId);
    				
    				log.audit('Contract ID = ' + contractId);
    				
    				
    				
    				// if contractId is found 
        			if(contractId !== '') {
        				
        				// update customer on contract
        				updateCustomerOnContract(contractId, entityId);
        				// set foundContractId to true
        				foundContractId = true;
        				// set custbody_contract_id to contractId
        				recordToSubmit.setValue({
        					fieldId: 'custbody_contract_id',
        					value: contractId
        				});
        			}
    			}
    			
    			// if custbody_contract_id is set then proceed below
    			// search project cornertrak id that matches custcol_csod_mavenlink_id
    			if(foundContractId) {
    				
        			
        			// get the id of the project
        			var projectId = getProjectId(mavenlinkId);
        			
        			// returns boolean
        			try {
        				if(projectId) {
        					checkAndUpdateProject(projectId, tranCurrency, contractId);
        				}
        			} catch(e) {
        				log.error({
        					title: 'ERROR WHILE UPDATING CURRENCY ON PROJECT',
        					details: e
        				});
        				
        				continue;
        				
        			} 
        			
        			if(projectId === '') {
        				failedLines.push(mavenlinkId);
        				sendEmail = true;
        			}
        			
        			// write project id to job(project) column
        			if(projectId) {
        				
        				try {
        				
        				recordToSubmit.selectLine({
        					sublistId: 'item',
        					line: i
        				});
        				
        				recordToSubmit.setCurrentSublistValue({
        					sublistId: 'item',
        					fieldId: 'custcol_project_selector',
        					value: projectId,
        					ignoreFieldChange: true
        				});
        				
        				recordToSubmit.setCurrentSublistValue({
        					sublistId: 'item',
        					fieldId: 'job',
        					value: projectId,
        					ignoreFieldChange: true
        				});
        				
        				
        					
        					recordToSubmit.commitLine({
            					sublistId: 'item'
            				});
        					linesCommited ++;
        					
        				} catch(e) {
        					log.error({
        						title: 'line ' + i + ' Commit Error',
        						details: e
        					});
        					
        					continue;
        				}
        				

        			}
    			}
    			
    		}
    		 
    	}
    	
    	
    	// send email to user if project was not found
    	if(sendEmail) {
    		var author = '117473';
    		var recipients = runtime.getCurrentUser().email;
    		var subject = 'Failed to find Project';
    		var body = 'Script could not locate project(s) for Cornertrak ID = '
    			+ failedLines.join() + '. <br/>'
    			+ 'Transaction ID - ' + newRec.getValue('tranid');
    		
    		email.send({
    			author: author,
    			recipients: [recipients],
    			subject: subject,
    			body: body
    		});
    	}
    	
    	// uncheck custbody_csod_run_project_auto_tag
    	
    	if(linesCommited > 0) {
    		recordToSubmit.setValue({
        		fieldId: 'custbody_csod_run_project_auto_tag',
        		value: false
        	});
    	}
    	
    	// Save Record
    	recordToSubmit.save({ignoreMandatoryFields: true});
    }
    
    
    function getProjectId(mavenlinkId) {
    	var projectId = '';
    	var jobSearchObj = search.create({
    		   type: "job",
    		   filters: [
    		      ["custentity_cornertrak_id","is",mavenlinkId]
    		   ],
    		   columns: [
    		      search.createColumn({
    		         name: "entityid",
    		         sort: search.Sort.ASC
    		      })
    		   ]
    		});
		var searchResultCount = jobSearchObj.runPaged().count;
		
		if(searchResultCount > 0) {
			jobSearchObj.run().each(function(result) {
				// find first search result and assign the ID to variable
				projectId = result.id;
	    	});
		}
    	
		log.debug({
			title: 'Project ID check',
			details: 'Project ID: ' + projectId
		});
		
    	return projectId;
    		
    }
    
    
    function getContractId(mavenlinkId) {
    	var contractId = '';
    	var customrecord_project_creationSearchObj = search.create({
		   type: "customrecord_project_creation",
		   filters: [
		      ["custrecord_cornertrak_id","is",mavenlinkId]
		   ],
		   columns: [
		      search.createColumn({
		         name: "internalid",
		         join: "CUSTRECORD_PC_LEGAL_CONTRACT_ID"
		      }),
		      search.createColumn({
		         name: "internalid",
		         join: "CUSTRECORD_PC_PROJECT"
		      })
		   ]
    	});
    	
		var searchResultCount = customrecord_project_creationSearchObj.runPaged().count;
		if(searchResultCount > 0) {
			customrecord_project_creationSearchObj.run().each(function(result){
				contractId = result.getValue({
					name: 'internalid',
					join: 'CUSTRECORD_PC_LEGAL_CONTRACT_ID'
				});
    		});
		}
		
		log.debug({
			title: 'Contract ID check',
			details: 'contractId: ' + contractId
		});
		
    	return contractId;
    		
    }
    
    
    function updateCustomerOnContract(contractId, custId) {
    	
		var contractIdRec = record.load({
			type: 'customrecord_contract_id',
			id: contractId,
			isDynamic: true
		});
		
		if(!contractIdRec.getValue('custrecord_customer_2')){
			contractIdRec.setValue({
    			fieldId: 'custrecord_customer_2',
    		    value: custId
    		})
    		
		}
		const internalId = contractIdRec.save();
		
		log.audit('Saved Contract ID : ' + internalId);
		
		if(internalId) {
			//triggerWorkflow69(internalId, 'customrecord_contract_id');
		}
    		
    }
    
    
    function checkAndUpdateProject(projectId, tranCurr, contractId) {
    	var lookupObj = search.lookupFields({
    		type: search.Type.JOB,
    		id: projectId,
    		columns: ['currency', 'custentity_contract_id']
    	});
    	var projectContract;
    	var projectCurr = lookupObj.currency[0].value;
    	if(lookupObj.custentity_contract_id[0]) {
    		projectContract = lookupObj.custentity_contract_id[0];
    	}
    	
    	 
    	if(projectCurr != tranCurr || !projectContract) {
    		
    		
			record.submitFields({
    			type: record.Type.JOB,
    			id: projectId,
    			values: {
    				currency: tranCurr,
    				custentity_contract_id: contractId
    			}
    			
    		});
    	
    	}
    	
    	
    	return true;
    	
    }
    
    function triggerWorkflow69(id, recordType) {
    	var workflowTask = task.create({taskType: task.TaskType.WORKFLOW_TRIGGER});
    	workflowTask.recordType = recordType;
    	workflowTask.recordId = id;
    	workflowTask.workflowId = 69;
    	var taskId = workflowTask.submit();
    	
    	log.audit("Workflow Triggered ID = " + taskId);
    }

    return {
    	beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
