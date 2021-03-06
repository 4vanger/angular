/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component, Injectable} from '@angular/core';
import {ROUTER_DIRECTIVES, ActivatedRoute, Router} from '@angular/router';
import * as db from './data';
import {Location} from '@angular/common';
import {PromiseWrapper, PromiseCompleter} from '@angular/core/src/facade/async';
import {isPresent, DateWrapper} from '@angular/core/src/facade/lang';

export class InboxRecord {
  id: string = '';
  subject: string = '';
  content: string = '';
  email: string = '';
  firstName: string = '';
  lastName: string = '';
  date: string;
  draft: boolean = false;

  constructor(data: {
    id: string,
    subject: string,
    content: string,
    email: string,
    firstName: string,
    lastName: string,
    date: string, draft?: boolean
  } = null) {
    if (isPresent(data)) {
      this.setData(data);
    }
  }

  setData(record: {
    id: string,
    subject: string,
    content: string,
    email: string,
    firstName: string,
    lastName: string,
    date: string, draft?: boolean
  }) {
    this.id = record['id'];
    this.subject = record['subject'];
    this.content = record['content'];
    this.email = record['email'];
    this.firstName = (record as any /** TODO #9100 */)['first-name'];
    this.lastName = (record as any /** TODO #9100 */)['last-name'];
    this.date = record['date'];
    this.draft = record['draft'] == true;
  }
}

@Injectable()
export class DbService {
  getData(): Promise<any[]> {
    var p = new PromiseCompleter<any[]>();
    p.resolve(db.data);
    return p.promise;
  }

  drafts(): Promise<any[]> {
    return this.getData().then(
        (data: any[]): any[] =>
            data.filter(record => isPresent(record['draft']) && record['draft'] == true));
  }

  emails(): Promise<any[]> {
    return this.getData().then((data: any[]): any[] =>
                                   data.filter(record => !isPresent(record['draft'])));
  }

  email(id: any /** TODO #9100 */): Promise<any> {
    return PromiseWrapper.then(this.getData(), (data: any[]) => {
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        if (entry['id'] == id) {
          return entry;
        }
      }
      return null;
    });
  }
}

@Component({selector: 'inbox', templateUrl: 'app/inbox.html', directives: ROUTER_DIRECTIVES})
export class InboxCmp {
  private items: InboxRecord[] = [];
  private ready: boolean = false;

  constructor(public router: Router, db: DbService, route: ActivatedRoute) {
    route.params.forEach(p => {
      const sortType = p['sort'];
      const sortEmailsByDate = isPresent(sortType) && sortType == "date";

      PromiseWrapper.then(db.emails(), (emails: any[]) => {
        this.ready = true;
        this.items = emails.map(data => new InboxRecord(data));

        if (sortEmailsByDate) {
          this.items.sort((a: InboxRecord, b: InboxRecord) =>
            DateWrapper.toMillis(DateWrapper.fromISOString(a.date)) <
            DateWrapper.toMillis(DateWrapper.fromISOString(b.date)) ?
              -1 :
              1);
        }
      });
    });
  }
}


@Component({selector: 'drafts', templateUrl: 'app/drafts.html', directives: ROUTER_DIRECTIVES})
export class DraftsCmp {
  private items: InboxRecord[] = [];
  private ready: boolean = false;

  constructor(private router: Router, db: DbService) {
    PromiseWrapper.then(db.drafts(), (drafts: any[]) => {
      this.ready = true;
      this.items = drafts.map(data => new InboxRecord(data));
    });
  }
}

export const ROUTER_CONFIG = [
  {path: '', terminal: true, redirectTo: 'inbox'},
  {path: 'inbox', component: InboxCmp},
  {path: 'drafts', component: DraftsCmp},
  {path: 'detail', mountChildren: 'app/inbox-detail.js' }
];

@Component({
  selector: 'inbox-app',
  viewProviders: [DbService],
  templateUrl: 'app/inbox-app.html',
  directives: ROUTER_DIRECTIVES,
  precompile: [InboxCmp, DraftsCmp]
})
export class InboxApp {}
