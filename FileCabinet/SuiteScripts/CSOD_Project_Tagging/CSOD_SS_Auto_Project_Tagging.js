/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	
    	updateCustomerOnProject();
    	
    	var salesOrderSearchObj = search.create({
    		type: search.Type.SALES_ORDER,
    		filters: [
    		  ["status","anyof","SalesOrd:A"],
    		  'AND',
	          ['job.internalid', 'is', '@NONE@'],
	          'AND',
	          ['custcol_csod_mavenlink_id', search.Operator.ISNOTEMPTY, null]
          	],
	        columns: [
 		      search.createColumn({
 		         name: "internalid",
 		         sort: search.Sort.ASC,
 		         summary: search.Summary.GROUP
 		      })
	     	]
    	});
    	
    	var searchCount = salesOrderSearchObj.runPaged().count;
    	
    	// exit script if search result is empty
    	if(searchCount == 0) {
    		return;
    	}
    	
    	// run search and make collections for the result
    	
    	var idsToResummit = [];
    	
    	salesOrderSearchObj.run().each(function(result) {
    		idsToResummit.push(result.getValue({
    			name: 'internalid',
    			summary: 'group'
    		}));
    		return true;
    	});
    	
    	for(var i = 0; i < idsToResummit.length; i++) {
    		var soId = idsToResummit[i];
    		
    		log.audit('Processing ' + soId);
    		
    		var soRec= record.load({
    			type: record.Type.SALES_ORDER,
    			id: soId,
    			isDynamic: true
    		});
    		
    		// check custbody_csod_run_project_auto_tag only if it is already not checked
    		if(!soRec.getValue('custbody_csod_run_project_auto_tag')) {
    			soRec.setValue({
        			fieldId: 'custbody_csod_run_project_auto_tag',
        			value: true
        		});
    		}

    		try{
    			soRec.save({
    			ignoreMandatoryFields: true
    			});
    		} catch(e) {
    			log.error({
    				title: 'ERROR WHILE SAVING SALES ORDER ID = ' + soId,
    				details: e
    			});
    			
    			continue;
    		}
    		
    	}
    	
    }
    
    function updateCustomerOnProject() {
    	var jobSearchObj = search.create({
    		   type: "job",
    		   filters:
    		   [
    		      ["custentity_contract_id","noneof","@NONE@"], 
    		      "AND", 
    		      ["custentity_contract_id.custrecord_customer_2","noneof","@NONE@"], 
    		      "AND", 
    		      ["customer","anyof","@NONE@"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({
    		         name: "internalid",
    		         join: "CUSTENTITY_CONTRACT_ID",
    		         summary: "GROUP",
    		         label: "Internal ID"
    		      }),
    		      search.createColumn({
    		         name: "custentity_contract_id",
    		         summary: "GROUP",
    		         label: "Contract ID"
    		      })
    		   ]
    		});
    		var searchResultCount = jobSearchObj.runPaged().count;
    		log.debug("jobSearchObj result count",searchResultCount);
    		jobSearchObj.run().each(function(result){
    		   // .run().each has a limit of 4,000 results
    			var contractId = result.getValue({
    				name: 'internalid',
    				join: 'CUSTENTITY_CONTRACT_ID',
    				summary: 'GROUP'
    			});
    			
    			if(contractId) {
    				var contractRec = record.load({
    					type: 'customrecord_contract_id',
    					id: contractId,
    					isDynamic: true
    				});
    				
    				try{
    					var savedRecId = contractRec.save();
        				
        				log.debug('Saved ContractId = ' + savedRecId);
    				} catch(e) {
    					log.error({
    						title: 'Error While Saving Contract ID ' + contractId,
    						details: e
    					});

    				}	
    				
    			}
    			
    		   return true;
    		});
    }

    return {
        execute: execute
    };
    
});
