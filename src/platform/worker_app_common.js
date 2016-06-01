'use strict';"use strict";
var xhr_1 = require('angular2/src/compiler/xhr');
var xhr_impl_1 = require('angular2/src/web_workers/worker/xhr_impl');
var renderer_1 = require('angular2/src/web_workers/worker/renderer');
var lang_1 = require('angular2/src/facade/lang');
var api_1 = require('angular2/src/core/render/api');
var core_1 = require('angular2/core');
var common_1 = require("angular2/common");
var client_message_broker_1 = require('angular2/src/web_workers/shared/client_message_broker');
var service_message_broker_1 = require('angular2/src/web_workers/shared/service_message_broker');
var serializer_1 = require("angular2/src/web_workers/shared/serializer");
var api_2 = require("angular2/src/web_workers/shared/api");
var di_1 = require('angular2/src/core/di');
var render_store_1 = require('angular2/src/web_workers/shared/render_store');
var PrintLogger = (function () {
    function PrintLogger() {
        this.log = lang_1.print;
        this.logError = lang_1.print;
        this.logGroup = lang_1.print;
    }
    PrintLogger.prototype.logGroupEnd = function () { };
    return PrintLogger;
}());
exports.WORKER_APP_PLATFORM = lang_1.CONST_EXPR([core_1.PLATFORM_COMMON_PROVIDERS]);
exports.WORKER_APP_APPLICATION_COMMON = lang_1.CONST_EXPR([
    core_1.APPLICATION_COMMON_PROVIDERS,
    common_1.FORM_PROVIDERS,
    serializer_1.Serializer,
    new di_1.Provider(core_1.PLATFORM_PIPES, { useValue: common_1.COMMON_PIPES, multi: true }),
    new di_1.Provider(core_1.PLATFORM_DIRECTIVES, { useValue: common_1.COMMON_DIRECTIVES, multi: true }),
    new di_1.Provider(client_message_broker_1.ClientMessageBrokerFactory, { useClass: client_message_broker_1.ClientMessageBrokerFactory_ }),
    new di_1.Provider(service_message_broker_1.ServiceMessageBrokerFactory, { useClass: service_message_broker_1.ServiceMessageBrokerFactory_ }),
    renderer_1.WebWorkerRootRenderer,
    new di_1.Provider(api_1.RootRenderer, { useExisting: renderer_1.WebWorkerRootRenderer }),
    new di_1.Provider(api_2.ON_WEB_WORKER, { useValue: true }),
    render_store_1.RenderStore,
    new di_1.Provider(core_1.ExceptionHandler, { useFactory: exceptionHandler, deps: [] }),
    xhr_impl_1.WebWorkerXHRImpl,
    new di_1.Provider(xhr_1.XHR, { useExisting: xhr_impl_1.WebWorkerXHRImpl })
]);
function exceptionHandler() {
    return new core_1.ExceptionHandler(new PrintLogger());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyX2FwcF9jb21tb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkaWZmaW5nX3BsdWdpbl93cmFwcGVyLW91dHB1dF9wYXRoLTFFYnJTTzRCLnRtcC9hbmd1bGFyMi9zcmMvcGxhdGZvcm0vd29ya2VyX2FwcF9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG9CQUFrQiwyQkFBMkIsQ0FBQyxDQUFBO0FBQzlDLHlCQUErQiwwQ0FBMEMsQ0FBQyxDQUFBO0FBQzFFLHlCQUFvQywwQ0FBMEMsQ0FBQyxDQUFBO0FBQy9FLHFCQUFpRCwwQkFBMEIsQ0FBQyxDQUFBO0FBQzVFLG9CQUEyQiw4QkFBOEIsQ0FBQyxDQUFBO0FBQzFELHFCQU1PLGVBQWUsQ0FBQyxDQUFBO0FBQ3ZCLHVCQUE4RCxpQkFBaUIsQ0FBQyxDQUFBO0FBQ2hGLHNDQUdPLHVEQUF1RCxDQUFDLENBQUE7QUFDL0QsdUNBR08sd0RBQXdELENBQUMsQ0FBQTtBQUNoRSwyQkFBeUIsNENBQTRDLENBQUMsQ0FBQTtBQUN0RSxvQkFBNEIscUNBQXFDLENBQUMsQ0FBQTtBQUNsRSxtQkFBdUIsc0JBQXNCLENBQUMsQ0FBQTtBQUM5Qyw2QkFBMEIsOENBQThDLENBQUMsQ0FBQTtBQUV6RTtJQUFBO1FBQ0UsUUFBRyxHQUFHLFlBQUssQ0FBQztRQUNaLGFBQVEsR0FBRyxZQUFLLENBQUM7UUFDakIsYUFBUSxHQUFHLFlBQUssQ0FBQztJQUVuQixDQUFDO0lBREMsaUNBQVcsR0FBWCxjQUFlLENBQUM7SUFDbEIsa0JBQUM7QUFBRCxDQUFDLEFBTEQsSUFLQztBQUVZLDJCQUFtQixHQUM1QixpQkFBVSxDQUFDLENBQUMsZ0NBQXlCLENBQUMsQ0FBQyxDQUFDO0FBRS9CLHFDQUE2QixHQUEyQyxpQkFBVSxDQUFDO0lBQzlGLG1DQUE0QjtJQUM1Qix1QkFBYztJQUNkLHVCQUFVO0lBQ1YsSUFBSSxhQUFRLENBQUMscUJBQWMsRUFBRSxFQUFDLFFBQVEsRUFBRSxxQkFBWSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQztJQUNuRSxJQUFJLGFBQVEsQ0FBQywwQkFBbUIsRUFBRSxFQUFDLFFBQVEsRUFBRSwwQkFBaUIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUM7SUFDN0UsSUFBSSxhQUFRLENBQUMsa0RBQTBCLEVBQUUsRUFBQyxRQUFRLEVBQUUsbURBQTJCLEVBQUMsQ0FBQztJQUNqRixJQUFJLGFBQVEsQ0FBQyxvREFBMkIsRUFBRSxFQUFDLFFBQVEsRUFBRSxxREFBNEIsRUFBQyxDQUFDO0lBQ25GLGdDQUFxQjtJQUNyQixJQUFJLGFBQVEsQ0FBQyxrQkFBWSxFQUFFLEVBQUMsV0FBVyxFQUFFLGdDQUFxQixFQUFDLENBQUM7SUFDaEUsSUFBSSxhQUFRLENBQUMsbUJBQWEsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUMsQ0FBQztJQUM3QywwQkFBVztJQUNYLElBQUksYUFBUSxDQUFDLHVCQUFnQixFQUFFLEVBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4RSwyQkFBZ0I7SUFDaEIsSUFBSSxhQUFRLENBQUMsU0FBRyxFQUFFLEVBQUMsV0FBVyxFQUFFLDJCQUFnQixFQUFDLENBQUM7Q0FDbkQsQ0FBQyxDQUFDO0FBRUg7SUFDRSxNQUFNLENBQUMsSUFBSSx1QkFBZ0IsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDakQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7WEhSfSBmcm9tICdhbmd1bGFyMi9zcmMvY29tcGlsZXIveGhyJztcbmltcG9ydCB7V2ViV29ya2VyWEhSSW1wbH0gZnJvbSAnYW5ndWxhcjIvc3JjL3dlYl93b3JrZXJzL3dvcmtlci94aHJfaW1wbCc7XG5pbXBvcnQge1dlYldvcmtlclJvb3RSZW5kZXJlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL3dlYl93b3JrZXJzL3dvcmtlci9yZW5kZXJlcic7XG5pbXBvcnQge3ByaW50LCBUeXBlLCBDT05TVF9FWFBSLCBpc1ByZXNlbnR9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge1Jvb3RSZW5kZXJlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvcmVuZGVyL2FwaSc7XG5pbXBvcnQge1xuICBQTEFURk9STV9ESVJFQ1RJVkVTLFxuICBQTEFURk9STV9QSVBFUyxcbiAgRXhjZXB0aW9uSGFuZGxlcixcbiAgQVBQTElDQVRJT05fQ09NTU9OX1BST1ZJREVSUyxcbiAgUExBVEZPUk1fQ09NTU9OX1BST1ZJREVSUyxcbn0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG5pbXBvcnQge0NPTU1PTl9ESVJFQ1RJVkVTLCBDT01NT05fUElQRVMsIEZPUk1fUFJPVklERVJTfSBmcm9tIFwiYW5ndWxhcjIvY29tbW9uXCI7XG5pbXBvcnQge1xuICBDbGllbnRNZXNzYWdlQnJva2VyRmFjdG9yeSxcbiAgQ2xpZW50TWVzc2FnZUJyb2tlckZhY3RvcnlfXG59IGZyb20gJ2FuZ3VsYXIyL3NyYy93ZWJfd29ya2Vycy9zaGFyZWQvY2xpZW50X21lc3NhZ2VfYnJva2VyJztcbmltcG9ydCB7XG4gIFNlcnZpY2VNZXNzYWdlQnJva2VyRmFjdG9yeSxcbiAgU2VydmljZU1lc3NhZ2VCcm9rZXJGYWN0b3J5X1xufSBmcm9tICdhbmd1bGFyMi9zcmMvd2ViX3dvcmtlcnMvc2hhcmVkL3NlcnZpY2VfbWVzc2FnZV9icm9rZXInO1xuaW1wb3J0IHtTZXJpYWxpemVyfSBmcm9tIFwiYW5ndWxhcjIvc3JjL3dlYl93b3JrZXJzL3NoYXJlZC9zZXJpYWxpemVyXCI7XG5pbXBvcnQge09OX1dFQl9XT1JLRVJ9IGZyb20gXCJhbmd1bGFyMi9zcmMvd2ViX3dvcmtlcnMvc2hhcmVkL2FwaVwiO1xuaW1wb3J0IHtQcm92aWRlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvZGknO1xuaW1wb3J0IHtSZW5kZXJTdG9yZX0gZnJvbSAnYW5ndWxhcjIvc3JjL3dlYl93b3JrZXJzL3NoYXJlZC9yZW5kZXJfc3RvcmUnO1xuXG5jbGFzcyBQcmludExvZ2dlciB7XG4gIGxvZyA9IHByaW50O1xuICBsb2dFcnJvciA9IHByaW50O1xuICBsb2dHcm91cCA9IHByaW50O1xuICBsb2dHcm91cEVuZCgpIHt9XG59XG5cbmV4cG9ydCBjb25zdCBXT1JLRVJfQVBQX1BMQVRGT1JNOiBBcnJheTxhbnkgLypUeXBlIHwgUHJvdmlkZXIgfCBhbnlbXSovPiA9XG4gICAgQ09OU1RfRVhQUihbUExBVEZPUk1fQ09NTU9OX1BST1ZJREVSU10pO1xuXG5leHBvcnQgY29uc3QgV09SS0VSX0FQUF9BUFBMSUNBVElPTl9DT01NT046IEFycmF5PGFueSAvKlR5cGUgfCBQcm92aWRlciB8IGFueVtdKi8+ID0gQ09OU1RfRVhQUihbXG4gIEFQUExJQ0FUSU9OX0NPTU1PTl9QUk9WSURFUlMsXG4gIEZPUk1fUFJPVklERVJTLFxuICBTZXJpYWxpemVyLFxuICBuZXcgUHJvdmlkZXIoUExBVEZPUk1fUElQRVMsIHt1c2VWYWx1ZTogQ09NTU9OX1BJUEVTLCBtdWx0aTogdHJ1ZX0pLFxuICBuZXcgUHJvdmlkZXIoUExBVEZPUk1fRElSRUNUSVZFUywge3VzZVZhbHVlOiBDT01NT05fRElSRUNUSVZFUywgbXVsdGk6IHRydWV9KSxcbiAgbmV3IFByb3ZpZGVyKENsaWVudE1lc3NhZ2VCcm9rZXJGYWN0b3J5LCB7dXNlQ2xhc3M6IENsaWVudE1lc3NhZ2VCcm9rZXJGYWN0b3J5X30pLFxuICBuZXcgUHJvdmlkZXIoU2VydmljZU1lc3NhZ2VCcm9rZXJGYWN0b3J5LCB7dXNlQ2xhc3M6IFNlcnZpY2VNZXNzYWdlQnJva2VyRmFjdG9yeV99KSxcbiAgV2ViV29ya2VyUm9vdFJlbmRlcmVyLFxuICBuZXcgUHJvdmlkZXIoUm9vdFJlbmRlcmVyLCB7dXNlRXhpc3Rpbmc6IFdlYldvcmtlclJvb3RSZW5kZXJlcn0pLFxuICBuZXcgUHJvdmlkZXIoT05fV0VCX1dPUktFUiwge3VzZVZhbHVlOiB0cnVlfSksXG4gIFJlbmRlclN0b3JlLFxuICBuZXcgUHJvdmlkZXIoRXhjZXB0aW9uSGFuZGxlciwge3VzZUZhY3Rvcnk6IGV4Y2VwdGlvbkhhbmRsZXIsIGRlcHM6IFtdfSksXG4gIFdlYldvcmtlclhIUkltcGwsXG4gIG5ldyBQcm92aWRlcihYSFIsIHt1c2VFeGlzdGluZzogV2ViV29ya2VyWEhSSW1wbH0pXG5dKTtcblxuZnVuY3Rpb24gZXhjZXB0aW9uSGFuZGxlcigpOiBFeGNlcHRpb25IYW5kbGVyIHtcbiAgcmV0dXJuIG5ldyBFeGNlcHRpb25IYW5kbGVyKG5ldyBQcmludExvZ2dlcigpKTtcbn1cbiJdfQ==