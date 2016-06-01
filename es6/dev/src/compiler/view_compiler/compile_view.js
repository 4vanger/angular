import { isPresent, isBlank } from 'angular2/src/facade/lang';
import { ListWrapper } from 'angular2/src/facade/collection';
import { BaseException } from 'angular2/src/facade/exceptions';
import * as o from '../output/output_ast';
import { Identifiers, identifierToken } from '../identifiers';
import { EventHandlerVars } from './constants';
import { CompileQuery, createQueryList, addQueryToTokenMap } from './compile_query';
import { CompileMethod } from './compile_method';
import { ViewType } from 'angular2/src/core/linker/view_type';
import { CompileIdentifierMetadata, CompileTokenMap } from '../compile_metadata';
import { getViewFactoryName, injectFromViewParentInjector, getPropertyInView } from './util';
import { bindPipeDestroyLifecycleCallbacks } from './lifecycle_binder';
export class CompilePipe {
    constructor() {
    }
}
export class CompileView {
    constructor(component, genConfig, pipeMetas, styles, viewIndex, declarationElement, templateVariableBindings) {
        this.component = component;
        this.genConfig = genConfig;
        this.pipeMetas = pipeMetas;
        this.styles = styles;
        this.viewIndex = viewIndex;
        this.declarationElement = declarationElement;
        this.templateVariableBindings = templateVariableBindings;
        this.namedAppElements = [];
        this.nodes = [];
        this.rootNodesOrAppElements = [];
        this.bindings = [];
        this.classStatements = [];
        this.eventHandlerMethods = [];
        this.fields = [];
        this.getters = [];
        this.disposables = [];
        this.subscriptions = [];
        this.pipes = new Map();
        this.variables = new Map();
        this.literalArrayCount = 0;
        this.literalMapCount = 0;
        this.createMethod = new CompileMethod(this);
        this.injectorGetMethod = new CompileMethod(this);
        this.updateContentQueriesMethod = new CompileMethod(this);
        this.dirtyParentQueriesMethod = new CompileMethod(this);
        this.updateViewQueriesMethod = new CompileMethod(this);
        this.detectChangesInInputsMethod = new CompileMethod(this);
        this.detectChangesRenderPropertiesMethod = new CompileMethod(this);
        this.afterContentLifecycleCallbacksMethod = new CompileMethod(this);
        this.afterViewLifecycleCallbacksMethod = new CompileMethod(this);
        this.destroyMethod = new CompileMethod(this);
        this.viewType = getViewType(component, viewIndex);
        this.className = `_View_${component.type.name}${viewIndex}`;
        this.classType = o.importType(new CompileIdentifierMetadata({ name: this.className }));
        this.viewFactory = o.variable(getViewFactoryName(component, viewIndex));
        if (this.viewType === ViewType.COMPONENT || this.viewType === ViewType.HOST) {
            this.componentView = this;
        }
        else {
            this.componentView = this.declarationElement.view.componentView;
        }
        var viewQueries = new CompileTokenMap();
        if (this.viewType === ViewType.COMPONENT) {
            var directiveInstance = o.THIS_EXPR.prop('context');
            ListWrapper.forEachWithIndex(this.component.viewQueries, (queryMeta, queryIndex) => {
                var propName = `_viewQuery_${queryMeta.selectors[0].name}_${queryIndex}`;
                var queryList = createQueryList(queryMeta, directiveInstance, propName, this);
                var query = new CompileQuery(queryMeta, queryList, directiveInstance, this);
                addQueryToTokenMap(viewQueries, query);
            });
            var constructorViewQueryCount = 0;
            this.component.type.diDeps.forEach((dep) => {
                if (isPresent(dep.viewQuery)) {
                    var queryList = o.THIS_EXPR.prop('declarationAppElement')
                        .prop('componentConstructorViewQueries')
                        .key(o.literal(constructorViewQueryCount++));
                    var query = new CompileQuery(dep.viewQuery, queryList, null, this);
                    addQueryToTokenMap(viewQueries, query);
                }
            });
        }
        this.viewQueries = viewQueries;
        templateVariableBindings.forEach((entry) => {
            this.variables.set(entry[1], o.THIS_EXPR.prop('locals').key(o.literal(entry[0])));
        });
        if (!this.declarationElement.isNull()) {
            this.declarationElement.setEmbeddedView(this);
        }
    }
    createPipe(name) {
        var pipeMeta = null;
        for (var i = this.pipeMetas.length - 1; i >= 0; i--) {
            var localPipeMeta = this.pipeMetas[i];
            if (localPipeMeta.name == name) {
                pipeMeta = localPipeMeta;
                break;
            }
        }
        if (isBlank(pipeMeta)) {
            throw new BaseException(`Illegal state: Could not find pipe ${name} although the parser should have detected this error!`);
        }
        var pipeFieldName = pipeMeta.pure ? `_pipe_${name}` : `_pipe_${name}_${this.pipes.size}`;
        var pipeExpr = this.pipes.get(pipeFieldName);
        if (isBlank(pipeExpr)) {
            var deps = pipeMeta.type.diDeps.map((diDep) => {
                if (diDep.token.equalsTo(identifierToken(Identifiers.ChangeDetectorRef))) {
                    return o.THIS_EXPR.prop('ref');
                }
                return injectFromViewParentInjector(diDep.token, false);
            });
            this.fields.push(new o.ClassField(pipeFieldName, o.importType(pipeMeta.type), [o.StmtModifier.Private]));
            this.createMethod.resetDebugInfo(null, null);
            this.createMethod.addStmt(o.THIS_EXPR.prop(pipeFieldName)
                .set(o.importExpr(pipeMeta.type).instantiate(deps))
                .toStmt());
            pipeExpr = o.THIS_EXPR.prop(pipeFieldName);
            this.pipes.set(pipeFieldName, pipeExpr);
            bindPipeDestroyLifecycleCallbacks(pipeMeta, pipeExpr, this);
        }
        return pipeExpr;
    }
    getVariable(name) {
        if (name == EventHandlerVars.event.name) {
            return EventHandlerVars.event;
        }
        var currView = this;
        var result = currView.variables.get(name);
        var viewPath = [];
        while (isBlank(result) && isPresent(currView.declarationElement.view)) {
            currView = currView.declarationElement.view;
            result = currView.variables.get(name);
            viewPath.push(currView);
        }
        if (isPresent(result)) {
            return getPropertyInView(result, viewPath);
        }
        else {
            return null;
        }
    }
    createLiteralArray(values) {
        return o.THIS_EXPR.callMethod('literalArray', [o.literal(this.literalArrayCount++), o.literalArr(values)]);
    }
    createLiteralMap(values) {
        return o.THIS_EXPR.callMethod('literalMap', [o.literal(this.literalMapCount++), o.literalMap(values)]);
    }
    afterNodes() {
        this.viewQueries.values().forEach((queries) => queries.forEach((query) => query.afterChildren(this.updateViewQueriesMethod)));
    }
}
function getViewType(component, embeddedTemplateIndex) {
    if (embeddedTemplateIndex > 0) {
        return ViewType.EMBEDDED;
    }
    else if (component.type.isHost) {
        return ViewType.HOST;
    }
    else {
        return ViewType.COMPONENT;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZV92aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC02QWhYZTI2Ry50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3ZpZXdfY29tcGlsZXIvY29tcGlsZV92aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBQyxNQUFNLDBCQUEwQjtPQUNwRCxFQUFDLFdBQVcsRUFBbUIsTUFBTSxnQ0FBZ0M7T0FDckUsRUFBQyxhQUFhLEVBQUMsTUFBTSxnQ0FBZ0M7T0FFckQsS0FBSyxDQUFDLE1BQU0sc0JBQXNCO09BQ2xDLEVBQUMsV0FBVyxFQUFFLGVBQWUsRUFBQyxNQUFNLGdCQUFnQjtPQUNwRCxFQUFDLGdCQUFnQixFQUFDLE1BQU0sYUFBYTtPQUNyQyxFQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxpQkFBaUI7T0FHMUUsRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0I7T0FDdkMsRUFBQyxRQUFRLEVBQUMsTUFBTSxvQ0FBb0M7T0FDcEQsRUFHTCx5QkFBeUIsRUFDekIsZUFBZSxFQUNoQixNQUFNLHFCQUFxQjtPQUNyQixFQUNMLGtCQUFrQixFQUNsQiw0QkFBNEIsRUFFNUIsaUJBQWlCLEVBQ2xCLE1BQU0sUUFBUTtPQUlSLEVBQUMsaUNBQWlDLEVBQUMsTUFBTSxvQkFBb0I7QUFFcEU7SUFDRTtJQUFlLENBQUM7QUFDbEIsQ0FBQztBQUVEO0lBc0NFLFlBQW1CLFNBQW1DLEVBQVMsU0FBeUIsRUFDckUsU0FBZ0MsRUFBUyxNQUFvQixFQUM3RCxTQUFpQixFQUFTLGtCQUFrQyxFQUM1RCx3QkFBb0M7UUFIcEMsY0FBUyxHQUFULFNBQVMsQ0FBMEI7UUFBUyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQUNyRSxjQUFTLEdBQVQsU0FBUyxDQUF1QjtRQUFTLFdBQU0sR0FBTixNQUFNLENBQWM7UUFD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O1FBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO0lBQzVCLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmt9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0xpc3RXcmFwcGVyLCBTdHJpbmdNYXBXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtCYXNlRXhjZXB0aW9ufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2V4Y2VwdGlvbnMnO1xuXG5pbXBvcnQgKiBhcyBvIGZyb20gJy4uL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7SWRlbnRpZmllcnMsIGlkZW50aWZpZXJUb2tlbn0gZnJvbSAnLi4vaWRlbnRpZmllcnMnO1xuaW1wb3J0IHtFdmVudEhhbmRsZXJWYXJzfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQge0NvbXBpbGVRdWVyeSwgY3JlYXRlUXVlcnlMaXN0LCBhZGRRdWVyeVRvVG9rZW5NYXB9IGZyb20gJy4vY29tcGlsZV9xdWVyeSc7XG5pbXBvcnQge05hbWVSZXNvbHZlcn0gZnJvbSAnLi9leHByZXNzaW9uX2NvbnZlcnRlcic7XG5pbXBvcnQge0NvbXBpbGVFbGVtZW50LCBDb21waWxlTm9kZX0gZnJvbSAnLi9jb21waWxlX2VsZW1lbnQnO1xuaW1wb3J0IHtDb21waWxlTWV0aG9kfSBmcm9tICcuL2NvbXBpbGVfbWV0aG9kJztcbmltcG9ydCB7Vmlld1R5cGV9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2xpbmtlci92aWV3X3R5cGUnO1xuaW1wb3J0IHtcbiAgQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLFxuICBDb21waWxlUGlwZU1ldGFkYXRhLFxuICBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhLFxuICBDb21waWxlVG9rZW5NYXBcbn0gZnJvbSAnLi4vY29tcGlsZV9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICBnZXRWaWV3RmFjdG9yeU5hbWUsXG4gIGluamVjdEZyb21WaWV3UGFyZW50SW5qZWN0b3IsXG4gIGNyZWF0ZURpVG9rZW5FeHByZXNzaW9uLFxuICBnZXRQcm9wZXJ0eUluVmlld1xufSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtDb21waWxlckNvbmZpZ30gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Q29tcGlsZUJpbmRpbmd9IGZyb20gJy4vY29tcGlsZV9iaW5kaW5nJztcblxuaW1wb3J0IHtiaW5kUGlwZURlc3Ryb3lMaWZlY3ljbGVDYWxsYmFja3N9IGZyb20gJy4vbGlmZWN5Y2xlX2JpbmRlcic7XG5cbmV4cG9ydCBjbGFzcyBDb21waWxlUGlwZSB7XG4gIGNvbnN0cnVjdG9yKCkge31cbn1cblxuZXhwb3J0IGNsYXNzIENvbXBpbGVWaWV3IGltcGxlbWVudHMgTmFtZVJlc29sdmVyIHtcbiAgcHVibGljIHZpZXdUeXBlOiBWaWV3VHlwZTtcbiAgcHVibGljIHZpZXdRdWVyaWVzOiBDb21waWxlVG9rZW5NYXA8Q29tcGlsZVF1ZXJ5W10+O1xuICBwdWJsaWMgbmFtZWRBcHBFbGVtZW50czogQXJyYXk8QXJyYXk8c3RyaW5nIHwgby5FeHByZXNzaW9uPj4gPSBbXTtcblxuICBwdWJsaWMgbm9kZXM6IENvbXBpbGVOb2RlW10gPSBbXTtcbiAgcHVibGljIHJvb3ROb2Rlc09yQXBwRWxlbWVudHM6IG8uRXhwcmVzc2lvbltdID0gW107XG5cbiAgcHVibGljIGJpbmRpbmdzOiBDb21waWxlQmluZGluZ1tdID0gW107XG5cbiAgcHVibGljIGNsYXNzU3RhdGVtZW50czogby5TdGF0ZW1lbnRbXSA9IFtdO1xuICBwdWJsaWMgY3JlYXRlTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgaW5qZWN0b3JHZXRNZXRob2Q6IENvbXBpbGVNZXRob2Q7XG4gIHB1YmxpYyB1cGRhdGVDb250ZW50UXVlcmllc01ldGhvZDogQ29tcGlsZU1ldGhvZDtcbiAgcHVibGljIGRpcnR5UGFyZW50UXVlcmllc01ldGhvZDogQ29tcGlsZU1ldGhvZDtcbiAgcHVibGljIHVwZGF0ZVZpZXdRdWVyaWVzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgZGV0ZWN0Q2hhbmdlc0luSW5wdXRzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgZGV0ZWN0Q2hhbmdlc1JlbmRlclByb3BlcnRpZXNNZXRob2Q6IENvbXBpbGVNZXRob2Q7XG4gIHB1YmxpYyBhZnRlckNvbnRlbnRMaWZlY3ljbGVDYWxsYmFja3NNZXRob2Q6IENvbXBpbGVNZXRob2Q7XG4gIHB1YmxpYyBhZnRlclZpZXdMaWZlY3ljbGVDYWxsYmFja3NNZXRob2Q6IENvbXBpbGVNZXRob2Q7XG4gIHB1YmxpYyBkZXN0cm95TWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgZXZlbnRIYW5kbGVyTWV0aG9kczogby5DbGFzc01ldGhvZFtdID0gW107XG5cbiAgcHVibGljIGZpZWxkczogby5DbGFzc0ZpZWxkW10gPSBbXTtcbiAgcHVibGljIGdldHRlcnM6IG8uQ2xhc3NHZXR0ZXJbXSA9IFtdO1xuICBwdWJsaWMgZGlzcG9zYWJsZXM6IG8uRXhwcmVzc2lvbltdID0gW107XG4gIHB1YmxpYyBzdWJzY3JpcHRpb25zOiBvLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gIHB1YmxpYyBjb21wb25lbnRWaWV3OiBDb21waWxlVmlldztcbiAgcHVibGljIHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIG8uRXhwcmVzc2lvbj4oKTtcbiAgcHVibGljIHZhcmlhYmxlcyA9IG5ldyBNYXA8c3RyaW5nLCBvLkV4cHJlc3Npb24+KCk7XG4gIHB1YmxpYyBjbGFzc05hbWU6IHN0cmluZztcbiAgcHVibGljIGNsYXNzVHlwZTogby5UeXBlO1xuICBwdWJsaWMgdmlld0ZhY3Rvcnk6IG8uUmVhZFZhckV4cHI7XG5cbiAgcHVibGljIGxpdGVyYWxBcnJheUNvdW50ID0gMDtcbiAgcHVibGljIGxpdGVyYWxNYXBDb3VudCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbXBvbmVudDogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLCBwdWJsaWMgZ2VuQ29uZmlnOiBDb21waWxlckNvbmZpZyxcbiAgICAgICAgICAgICAgcHVibGljIHBpcGVNZXRhczogQ29tcGlsZVBpcGVNZXRhZGF0YVtdLCBwdWJsaWMgc3R5bGVzOiBvLkV4cHJlc3Npb24sXG4gICAgICAgICAgICAgIHB1YmxpYyB2aWV3SW5kZXg6IG51bWJlciwgcHVibGljIGRlY2xhcmF0aW9uRWxlbWVudDogQ29tcGlsZUVsZW1lbnQsXG4gICAgICAgICAgICAgIHB1YmxpYyB0ZW1wbGF0ZVZhcmlhYmxlQmluZGluZ3M6IHN0cmluZ1tdW10pIHtcbiAgICB0aGlzLmNyZWF0ZU1ldGhvZCA9IG5ldyBDb21waWxlTWV0aG9kKHRoaXMpO1xuICAgIHRoaXMuaW5qZWN0b3JHZXRNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcbiAgICB0aGlzLnVwZGF0ZUNvbnRlbnRRdWVyaWVzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy5kaXJ0eVBhcmVudFF1ZXJpZXNNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcbiAgICB0aGlzLnVwZGF0ZVZpZXdRdWVyaWVzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy5kZXRlY3RDaGFuZ2VzSW5JbnB1dHNNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcbiAgICB0aGlzLmRldGVjdENoYW5nZXNSZW5kZXJQcm9wZXJ0aWVzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG5cbiAgICB0aGlzLmFmdGVyQ29udGVudExpZmVjeWNsZUNhbGxiYWNrc01ldGhvZCA9IG5ldyBDb21waWxlTWV0aG9kKHRoaXMpO1xuICAgIHRoaXMuYWZ0ZXJWaWV3TGlmZWN5Y2xlQ2FsbGJhY2tzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy5kZXN0cm95TWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG5cbiAgICB0aGlzLnZpZXdUeXBlID0gZ2V0Vmlld1R5cGUoY29tcG9uZW50LCB2aWV3SW5kZXgpO1xuICAgIHRoaXMuY2xhc3NOYW1lID0gYF9WaWV3XyR7Y29tcG9uZW50LnR5cGUubmFtZX0ke3ZpZXdJbmRleH1gO1xuICAgIHRoaXMuY2xhc3NUeXBlID0gby5pbXBvcnRUeXBlKG5ldyBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhKHtuYW1lOiB0aGlzLmNsYXNzTmFtZX0pKTtcbiAgICB0aGlzLnZpZXdGYWN0b3J5ID0gby52YXJpYWJsZShnZXRWaWV3RmFjdG9yeU5hbWUoY29tcG9uZW50LCB2aWV3SW5kZXgpKTtcbiAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gVmlld1R5cGUuQ09NUE9ORU5UIHx8IHRoaXMudmlld1R5cGUgPT09IFZpZXdUeXBlLkhPU1QpIHtcbiAgICAgIHRoaXMuY29tcG9uZW50VmlldyA9IHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tcG9uZW50VmlldyA9IHRoaXMuZGVjbGFyYXRpb25FbGVtZW50LnZpZXcuY29tcG9uZW50VmlldztcbiAgICB9XG4gICAgdmFyIHZpZXdRdWVyaWVzID0gbmV3IENvbXBpbGVUb2tlbk1hcDxDb21waWxlUXVlcnlbXT4oKTtcbiAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gVmlld1R5cGUuQ09NUE9ORU5UKSB7XG4gICAgICB2YXIgZGlyZWN0aXZlSW5zdGFuY2UgPSBvLlRISVNfRVhQUi5wcm9wKCdjb250ZXh0Jyk7XG4gICAgICBMaXN0V3JhcHBlci5mb3JFYWNoV2l0aEluZGV4KHRoaXMuY29tcG9uZW50LnZpZXdRdWVyaWVzLCAocXVlcnlNZXRhLCBxdWVyeUluZGV4KSA9PiB7XG4gICAgICAgIHZhciBwcm9wTmFtZSA9IGBfdmlld1F1ZXJ5XyR7cXVlcnlNZXRhLnNlbGVjdG9yc1swXS5uYW1lfV8ke3F1ZXJ5SW5kZXh9YDtcbiAgICAgICAgdmFyIHF1ZXJ5TGlzdCA9IGNyZWF0ZVF1ZXJ5TGlzdChxdWVyeU1ldGEsIGRpcmVjdGl2ZUluc3RhbmNlLCBwcm9wTmFtZSwgdGhpcyk7XG4gICAgICAgIHZhciBxdWVyeSA9IG5ldyBDb21waWxlUXVlcnkocXVlcnlNZXRhLCBxdWVyeUxpc3QsIGRpcmVjdGl2ZUluc3RhbmNlLCB0aGlzKTtcbiAgICAgICAgYWRkUXVlcnlUb1Rva2VuTWFwKHZpZXdRdWVyaWVzLCBxdWVyeSk7XG4gICAgICB9KTtcbiAgICAgIHZhciBjb25zdHJ1Y3RvclZpZXdRdWVyeUNvdW50ID0gMDtcbiAgICAgIHRoaXMuY29tcG9uZW50LnR5cGUuZGlEZXBzLmZvckVhY2goKGRlcCkgPT4ge1xuICAgICAgICBpZiAoaXNQcmVzZW50KGRlcC52aWV3UXVlcnkpKSB7XG4gICAgICAgICAgdmFyIHF1ZXJ5TGlzdCA9IG8uVEhJU19FWFBSLnByb3AoJ2RlY2xhcmF0aW9uQXBwRWxlbWVudCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucHJvcCgnY29tcG9uZW50Q29uc3RydWN0b3JWaWV3UXVlcmllcycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAua2V5KG8ubGl0ZXJhbChjb25zdHJ1Y3RvclZpZXdRdWVyeUNvdW50KyspKTtcbiAgICAgICAgICB2YXIgcXVlcnkgPSBuZXcgQ29tcGlsZVF1ZXJ5KGRlcC52aWV3UXVlcnksIHF1ZXJ5TGlzdCwgbnVsbCwgdGhpcyk7XG4gICAgICAgICAgYWRkUXVlcnlUb1Rva2VuTWFwKHZpZXdRdWVyaWVzLCBxdWVyeSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLnZpZXdRdWVyaWVzID0gdmlld1F1ZXJpZXM7XG4gICAgdGVtcGxhdGVWYXJpYWJsZUJpbmRpbmdzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICB0aGlzLnZhcmlhYmxlcy5zZXQoZW50cnlbMV0sIG8uVEhJU19FWFBSLnByb3AoJ2xvY2FscycpLmtleShvLmxpdGVyYWwoZW50cnlbMF0pKSk7XG4gICAgfSk7XG5cbiAgICBpZiAoIXRoaXMuZGVjbGFyYXRpb25FbGVtZW50LmlzTnVsbCgpKSB7XG4gICAgICB0aGlzLmRlY2xhcmF0aW9uRWxlbWVudC5zZXRFbWJlZGRlZFZpZXcodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgY3JlYXRlUGlwZShuYW1lOiBzdHJpbmcpOiBvLkV4cHJlc3Npb24ge1xuICAgIHZhciBwaXBlTWV0YTogQ29tcGlsZVBpcGVNZXRhZGF0YSA9IG51bGw7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMucGlwZU1ldGFzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgbG9jYWxQaXBlTWV0YSA9IHRoaXMucGlwZU1ldGFzW2ldO1xuICAgICAgaWYgKGxvY2FsUGlwZU1ldGEubmFtZSA9PSBuYW1lKSB7XG4gICAgICAgIHBpcGVNZXRhID0gbG9jYWxQaXBlTWV0YTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0JsYW5rKHBpcGVNZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXG4gICAgICAgICAgYElsbGVnYWwgc3RhdGU6IENvdWxkIG5vdCBmaW5kIHBpcGUgJHtuYW1lfSBhbHRob3VnaCB0aGUgcGFyc2VyIHNob3VsZCBoYXZlIGRldGVjdGVkIHRoaXMgZXJyb3IhYCk7XG4gICAgfVxuICAgIHZhciBwaXBlRmllbGROYW1lID0gcGlwZU1ldGEucHVyZSA/IGBfcGlwZV8ke25hbWV9YCA6IGBfcGlwZV8ke25hbWV9XyR7dGhpcy5waXBlcy5zaXplfWA7XG4gICAgdmFyIHBpcGVFeHByID0gdGhpcy5waXBlcy5nZXQocGlwZUZpZWxkTmFtZSk7XG4gICAgaWYgKGlzQmxhbmsocGlwZUV4cHIpKSB7XG4gICAgICB2YXIgZGVwcyA9IHBpcGVNZXRhLnR5cGUuZGlEZXBzLm1hcCgoZGlEZXApID0+IHtcbiAgICAgICAgaWYgKGRpRGVwLnRva2VuLmVxdWFsc1RvKGlkZW50aWZpZXJUb2tlbihJZGVudGlmaWVycy5DaGFuZ2VEZXRlY3RvclJlZikpKSB7XG4gICAgICAgICAgcmV0dXJuIG8uVEhJU19FWFBSLnByb3AoJ3JlZicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbmplY3RGcm9tVmlld1BhcmVudEluamVjdG9yKGRpRGVwLnRva2VuLCBmYWxzZSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuZmllbGRzLnB1c2goXG4gICAgICAgICAgbmV3IG8uQ2xhc3NGaWVsZChwaXBlRmllbGROYW1lLCBvLmltcG9ydFR5cGUocGlwZU1ldGEudHlwZSksIFtvLlN0bXRNb2RpZmllci5Qcml2YXRlXSkpO1xuICAgICAgdGhpcy5jcmVhdGVNZXRob2QucmVzZXREZWJ1Z0luZm8obnVsbCwgbnVsbCk7XG4gICAgICB0aGlzLmNyZWF0ZU1ldGhvZC5hZGRTdG10KG8uVEhJU19FWFBSLnByb3AocGlwZUZpZWxkTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zZXQoby5pbXBvcnRFeHByKHBpcGVNZXRhLnR5cGUpLmluc3RhbnRpYXRlKGRlcHMpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RtdCgpKTtcbiAgICAgIHBpcGVFeHByID0gby5USElTX0VYUFIucHJvcChwaXBlRmllbGROYW1lKTtcbiAgICAgIHRoaXMucGlwZXMuc2V0KHBpcGVGaWVsZE5hbWUsIHBpcGVFeHByKTtcbiAgICAgIGJpbmRQaXBlRGVzdHJveUxpZmVjeWNsZUNhbGxiYWNrcyhwaXBlTWV0YSwgcGlwZUV4cHIsIHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gcGlwZUV4cHI7XG4gIH1cblxuICBnZXRWYXJpYWJsZShuYW1lOiBzdHJpbmcpOiBvLkV4cHJlc3Npb24ge1xuICAgIGlmIChuYW1lID09IEV2ZW50SGFuZGxlclZhcnMuZXZlbnQubmFtZSkge1xuICAgICAgcmV0dXJuIEV2ZW50SGFuZGxlclZhcnMuZXZlbnQ7XG4gICAgfVxuICAgIHZhciBjdXJyVmlldzogQ29tcGlsZVZpZXcgPSB0aGlzO1xuICAgIHZhciByZXN1bHQgPSBjdXJyVmlldy52YXJpYWJsZXMuZ2V0KG5hbWUpO1xuICAgIHZhciB2aWV3UGF0aCA9IFtdO1xuICAgIHdoaWxlIChpc0JsYW5rKHJlc3VsdCkgJiYgaXNQcmVzZW50KGN1cnJWaWV3LmRlY2xhcmF0aW9uRWxlbWVudC52aWV3KSkge1xuICAgICAgY3VyclZpZXcgPSBjdXJyVmlldy5kZWNsYXJhdGlvbkVsZW1lbnQudmlldztcbiAgICAgIHJlc3VsdCA9IGN1cnJWaWV3LnZhcmlhYmxlcy5nZXQobmFtZSk7XG4gICAgICB2aWV3UGF0aC5wdXNoKGN1cnJWaWV3KTtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChyZXN1bHQpKSB7XG4gICAgICByZXR1cm4gZ2V0UHJvcGVydHlJblZpZXcocmVzdWx0LCB2aWV3UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUxpdGVyYWxBcnJheSh2YWx1ZXM6IG8uRXhwcmVzc2lvbltdKTogby5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gby5USElTX0VYUFIuY2FsbE1ldGhvZCgnbGl0ZXJhbEFycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbby5saXRlcmFsKHRoaXMubGl0ZXJhbEFycmF5Q291bnQrKyksIG8ubGl0ZXJhbEFycih2YWx1ZXMpXSk7XG4gIH1cbiAgY3JlYXRlTGl0ZXJhbE1hcCh2YWx1ZXM6IEFycmF5PEFycmF5PHN0cmluZyB8IG8uRXhwcmVzc2lvbj4+KTogby5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gby5USElTX0VYUFIuY2FsbE1ldGhvZCgnbGl0ZXJhbE1hcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW28ubGl0ZXJhbCh0aGlzLmxpdGVyYWxNYXBDb3VudCsrKSwgby5saXRlcmFsTWFwKHZhbHVlcyldKTtcbiAgfVxuXG4gIGFmdGVyTm9kZXMoKSB7XG4gICAgdGhpcy52aWV3UXVlcmllcy52YWx1ZXMoKS5mb3JFYWNoKFxuICAgICAgICAocXVlcmllcykgPT4gcXVlcmllcy5mb3JFYWNoKChxdWVyeSkgPT4gcXVlcnkuYWZ0ZXJDaGlsZHJlbih0aGlzLnVwZGF0ZVZpZXdRdWVyaWVzTWV0aG9kKSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFZpZXdUeXBlKGNvbXBvbmVudDogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLCBlbWJlZGRlZFRlbXBsYXRlSW5kZXg6IG51bWJlcik6IFZpZXdUeXBlIHtcbiAgaWYgKGVtYmVkZGVkVGVtcGxhdGVJbmRleCA+IDApIHtcbiAgICByZXR1cm4gVmlld1R5cGUuRU1CRURERUQ7XG4gIH0gZWxzZSBpZiAoY29tcG9uZW50LnR5cGUuaXNIb3N0KSB7XG4gICAgcmV0dXJuIFZpZXdUeXBlLkhPU1Q7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFZpZXdUeXBlLkNPTVBPTkVOVDtcbiAgfVxufVxuIl19