// 访问控制
export class AcEntity {

    // 权限判断
    ignore: boolean = false;

    // 错误检查
    errorchk: boolean = true;

    // 配额检查
    quota: boolean = true;
}

export const ACROOT = new AcEntity();
ACROOT.ignore = true;
ACROOT.errorchk = false;
ACROOT.quota = false;