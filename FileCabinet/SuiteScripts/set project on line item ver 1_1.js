/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       1 Sep 2015     jbrar
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 * @returns {Void}
 */
function workflowAction_setproject()
//
{	
	var stLoggerTitle = 'workflowAction_setproject';
	nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');
    var thisRecord = ('salesorder')
    var thisRecordb = nlapiGetFieldValue('custbody_contract_id') 

    try
    {    	
    	var stcontractid = thisRecordb;
    	nlapiLogExecution('DEBUG', stLoggerTitle, 'contract id = ' + stcontractid);
        var contractid = stcontractid;
    	
        if (!isEmpty(stcontractid))
        {
        	var intLineItemCount = nlapiGetLineItemCount('item');    	
        	for (var i = 1; i <= intLineItemCount; i++)
        	{
        		var stProjectselector = nlapiGetLineItemValue('item', 'custcol_project_selector', i); 
        		var stexistingProject = nlapiGetLineItemValue('item', 'job', i); 
        
        		if(!isEqual(stProjectselector))
        		{
        			if(isEqual(stexistingProject))
        			{
        				nlapiLogExecution('DEBUG', 'Execution Context', nlapiGetContext().getExecutionContext());
        				if(nlapiGetContext().getExecutionContext() == 'csvimport' || nlapiGetContext().getExecutionContext() == 'workflow') {
        					nlapiSetLineItemValue('item', 'job', i, stProjectselector);
        				}
        				nlapiCommitLineItem('recmachcustrecord_pc_legal_contract_id');
        				nlapiLogExecution('DEBUG', stLoggerTitle, 'project is set on line ' + i);
               
        			}
        		}  
        	}
       }

        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');
    } 
    catch (error)
    {
    	if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error', error.toString()); 
            throw nlapiCreateError('99999', error.toString());
        }     	 
        //return false;
    }    
}

/**
 * Check if value is empty
 * @param stValue
 * @returns {Boolean}
 */
function isEmpty(stValue)
{
	if ((stValue == '') || (stValue == null) ||(stValue == undefined))
    {
        return true;
    }
    
    return false;
}
/**
 * Check if value is empty
 * @param stProjectselector
 * @returns {Boolean}
 */
function isEqual(stProjectselector)
{
	if ((stProjectselector == '') || (stProjectselector == null) ||(stProjectselector == undefined))
    {
        return true;
    }
    
    return false;
}
/**
 * Check if value is empty
 * @param stexistingProject
 * @returns {Boolean}
 */
function isEqual(stexistingProject)
{
	if ((stexistingProject == '') || (stexistingProject == null) ||(stexistingProject == undefined))
    {
        return true;
    }
    
    return false;
}
